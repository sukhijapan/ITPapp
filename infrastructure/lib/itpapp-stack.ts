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
import * as events from 'aws-cdk-lib/aws-events';
import * as events_targets from 'aws-cdk-lib/aws-events-targets';

export class ItpAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Secrets are sourced from environment variables at CDK synth time.
    // For POC/dev, fallback to placeholder values if not set.
    const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
    const internalApiSecret = process.env.INTERNAL_API_SECRET || 'dev-internal-secret-change-me';
    const adminApiKey = process.env.ADMIN_API_KEY || 'dev-admin-key-change-me';

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
    // Lifecycle: transition to Glacier after 90 days for compliance audit trail; no hard deletion
    const notificationBucket = new s3.Bucket(this, 'NotificationBucket', {
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        { expiration: cdk.Duration.days(7), prefix: 'ncr/' },
        { expiration: cdk.Duration.days(7), prefix: 'email/' },
        { expiration: cdk.Duration.days(7), prefix: 'wp-notification/' },
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
        JWT_SECRET: jwtSecret,
        ADMIN_API_KEY: adminApiKey,
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

    // ── 10. WP Timer Lambda (OUTSIDE VPC — calls backend API) ───────────
    // Use a fixed function name so we can reference the ARN from the backend Lambda
    // without creating a CloudFormation dependency (which would cause a circular dep).
    const wpTimerFunctionName = `${this.stackName}-WpTimerHandler`;

    const wpTimerHandler = new lambda.Function(this, 'WpTimerHandler', {
      functionName: wpTimerFunctionName,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../infrastructure/lambda/wp-timer'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 128,
      environment: {
        INTERNAL_API_SECRET: internalApiSecret,
      },
    });

    // ── 11. WP Timer Sweep Lambda (OUTSIDE VPC — queries DB and calls backend) ──
    const wpTimerSweep = new lambda.Function(this, 'WpTimerSweep', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'sweep.handler',
      code: lambda.Code.fromAsset('../infrastructure/lambda/wp-timer'),
      timeout: cdk.Duration.seconds(120),
      memorySize: 256,
      environment: {
        INTERNAL_API_SECRET: internalApiSecret,
        DATABASE_URL: `postgresql://postgres:${database.secret!.secretValueFromJson('password').unsafeUnwrap()}@${database.instanceEndpoint.hostname}:5432/itpapp`,
      },
    });

    // wp-timer Lambdas call the backend via its public Function URL (authType: NONE)
    // No IAM invoke permissions needed — they use HTTP requests with internal secret header

    // ── 12. EventBridge Scheduler IAM Role ──────────────────────────────
    // Role assumed by EventBridge Scheduler to invoke the wp-timer Lambda.
    // We use the pre-determined ARN string to avoid circular dependencies.
    const schedulerRole = new iam.Role(this, 'WpSchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
      description: 'Role for EventBridge Scheduler to invoke WP Timer Lambda',
      inlinePolicies: {
        InvokeWpTimer: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['lambda:InvokeFunction'],
              resources: [`arn:aws:lambda:${this.region}:${this.account}:function:${wpTimerFunctionName}`],
            }),
          ],
        }),
      },
    });

    // Grant backend Lambda permissions to create/delete EventBridge schedules
    backend.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'scheduler:CreateSchedule',
        'scheduler:DeleteSchedule',
        'scheduler:GetSchedule',
      ],
      resources: ['*'],
    }));

    // Grant backend Lambda permission to pass the scheduler role to EventBridge Scheduler
    backend.addToRolePolicy(new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: [schedulerRole.roleArn],
    }));

    // Add scheduler-related environment variables to backend Lambda.
    // Use the pre-determined function name to construct the ARN string directly,
    // avoiding a CloudFormation-level dependency from backend → wpTimerHandler.
    const wpTimerLambdaArn = `arn:aws:lambda:${this.region}:${this.account}:function:${wpTimerFunctionName}`;
    backend.addEnvironment('WP_TIMER_LAMBDA_ARN', wpTimerLambdaArn);
    backend.addEnvironment('WP_SCHEDULER_ROLE_ARN', schedulerRole.roleArn);
    backend.addEnvironment('INTERNAL_API_SECRET', internalApiSecret);

    // Set BACKEND_URL on timer Lambdas using the Function URL.
    wpTimerHandler.addEnvironment('BACKEND_URL', fnUrl.url);
    wpTimerSweep.addEnvironment('BACKEND_URL', fnUrl.url);

    // ── 13. EventBridge Rule — Sweep every 5 minutes ────────────────────
    const sweepRule = new events.Rule(this, 'WpTimerSweepRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      description: 'Triggers WP timer sweep Lambda every 5 minutes to catch missed expirations',
    });

    sweepRule.addTarget(new events_targets.LambdaFunction(wpTimerSweep));

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
    new cdk.CfnOutput(this, 'WpTimerLambdaArn', {
      value: wpTimerHandler.functionArn,
      description: 'ARN of the WP Timer Lambda function',
    });
    new cdk.CfnOutput(this, 'WpSchedulerRoleArn', {
      value: schedulerRole.roleArn,
      description: 'ARN of the EventBridge Scheduler role for WP timers',
    });
  }
}
