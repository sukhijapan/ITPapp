import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3_deployment from 'aws-cdk-lib/aws-s3-deployment';

export class ItpAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── 1. VPC — minimum cost, public subnets only ──────────────────────
    const vpc = new ec2.Vpc(this, 'ItpVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC },
      ],
    });

    // S3 Gateway Endpoint — free, allows VPC Lambda to reach S3
    vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // ── 2. S3 Buckets ───────────────────────────────────────────────────
    const storageBucket = new s3.Bucket(this, 'ItpStorage', {
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
    });

    // Notification bucket — VPC Lambda drops JSON here, triggers non-VPC Lambda
    const notificationBucket = new s3.Bucket(this, 'NotificationBucket', {
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        { expiration: cdk.Duration.days(7), prefix: 'ncr/' },
        { expiration: cdk.Duration.days(7), prefix: 'email/' },
      ],
    });

    // ── 3. Frontend ─────────────────────────────────────────────────────
    const frontendBucket = new s3.Bucket(this, 'ItpFrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, 'ItpDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    new s3_deployment.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3_deployment.Source.asset('../frontend/dist')],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ── 4. Security Groups ──────────────────────────────────────────────
    const lambdaSG = new ec2.SecurityGroup(this, 'LambdaSG', { vpc });
    const dbSG = new ec2.SecurityGroup(this, 'DbSG', { vpc });
    dbSG.addIngressRule(lambdaSG, ec2.Port.tcp(5432), 'Allow Lambda access to Postgres');

    // ── 5. RDS Database ─────────────────────────────────────────────────
    const database = new rds.DatabaseInstance(this, 'ItpDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.of('16.6', '16') }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [dbSG],
      allocatedStorage: 20,
      maxAllocatedStorage: 20,
      databaseName: 'itpapp',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      backupRetention: cdk.Duration.days(1),
    });

    // ── 6. Notifier Lambda (OUTSIDE VPC — sends HTML email via SES) ─────
    const notifier = new lambda.Function(this, 'NcrNotifier', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../infrastructure/lambda/notifier'),
      timeout: cdk.Duration.seconds(15),
      memorySize: 128,
      environment: {
        FRONTEND_URL: 'https://applications.ozcc.com.au',
        SES_FROM_EMAIL: 'noreply@emails.ozcc.com.au',
        SES_TO_EMAIL: 'eddyk@ozcc.com.au',
        AWS_SES_REGION: 'ap-southeast-2',
      },
    });

    // Grant SES send permission
    notifier.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    notificationBucket.grantRead(notifier);

    // Trigger notifier when any JSON file lands in the notification bucket
    // The Lambda routes by key prefix: ncr/ for NCR emails, email/ for onboarding emails
    notificationBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(notifier),
      { suffix: '.json' },
    );

    // ── 8. Backend Lambda (IN VPC — writes to S3 for notifications) ─────
    const backend = new lambda.Function(this, 'ItpBackend', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'src/index.handler',
      code: lambda.Code.fromAsset('../backend'),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(90),
      memorySize: 2048,
      environment: {
        DB_HOST: database.instanceEndpoint.hostname,
        DB_NAME: 'itpapp',
        DB_USER: 'postgres',
        DB_PASSWORD: database.secret!.secretValueFromJson('password').unsafeUnwrap(),
        STORAGE_BUCKET: storageBucket.bucketName,
        NOTIFICATION_BUCKET: notificationBucket.bucketName,
        NODE_ENV: 'production',
        JWT_SECRET: 'your_production_jwt_secret',
        FRONTEND_URL: 'https://applications.ozcc.com.au',
        APP_URL: 'https://applications.ozcc.com.au',
        EMAIL_TRANSPORT: 'ses',
        SES_REGION: 'ap-southeast-2',
        SES_FROM_EMAIL: 'noreply@emails.ozcc.com.au',
      },
    });

    storageBucket.grantReadWrite(backend);
    notificationBucket.grantWrite(backend); // only needs to put objects

    // Grant SES send permission for user onboarding emails
    backend.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    // ── 9. Lambda Function URL ──────────────────────────────────────────
    const fnUrl = backend.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: [
          `https://${distribution.distributionDomainName}`,
          'https://applications.ozcc.com.au',
        ],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(24),
      },
    });

    backend.addPermission('PublicInvoke', {
      principal: new iam.AnyPrincipal(),
      action: 'lambda:InvokeFunctionUrl',
      functionUrlAuthType: lambda.FunctionUrlAuthType.NONE,
    });
    backend.addPermission('PublicInvokeFunction', {
      principal: new iam.AnyPrincipal(),
      action: 'lambda:InvokeFunction',
    });

    // ── Outputs ─────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: fnUrl.url,
      description: 'The URL of the Backend API',
    });
    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'The URL of the Frontend',
    });
    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
    });
    new cdk.CfnOutput(this, 'NotificationBucketName', {
      value: notificationBucket.bucketName,
    });
  }
}
