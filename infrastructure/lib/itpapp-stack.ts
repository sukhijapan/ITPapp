import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3_deployment from 'aws-cdk-lib/aws-s3-deployment';

export class ItpAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. VPC - Configured for absolute minimum cost
    const vpc = new ec2.Vpc(this, 'ItpVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ],
    });

    // 2. Storage for Media & Reports
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

    // 3. Frontend Hosting
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
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Deploy Frontend
    new s3_deployment.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3_deployment.Source.asset('../frontend/dist')],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // 4. Security Groups
    const lambdaSG = new ec2.SecurityGroup(this, 'LambdaSG', { vpc });
    const dbSG = new ec2.SecurityGroup(this, 'DbSG', { vpc });
    dbSG.addIngressRule(lambdaSG, ec2.Port.tcp(5432), 'Allow Lambda access to Postgres');

    // 5. RDS Database
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

    // 6. Backend Lambda
    const backend = new lambda.Function(this, 'ItpBackend', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'src/index.handler',
      code: lambda.Code.fromAsset('../backend'),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        DB_HOST: database.instanceEndpoint.hostname,
        DB_NAME: 'itpapp',
        DB_USER: 'postgres',
        DB_PASSWORD: database.secret!.secretValueFromJson('password').unsafeUnwrap(),
        STORAGE_BUCKET: storageBucket.bucketName,
        NODE_ENV: 'production',
        JWT_SECRET: 'your_production_jwt_secret',
        FRONTEND_URL: `https://${distribution.distributionDomainName}`,
      },
    });

    // 7. Lambda Function URL
    const fnUrl = backend.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      // CORS is handled by Express middleware — don't duplicate it here
    });

    // Explicitly grant public access to the Function URL
    // Since Oct 2025, Function URLs require both InvokeFunctionUrl AND InvokeFunction
    backend.addPermission('PublicInvoke', {
      principal: new iam.AnyPrincipal(),
      action: 'lambda:InvokeFunctionUrl',
      functionUrlAuthType: lambda.FunctionUrlAuthType.NONE,
    });
    backend.addPermission('PublicInvokeFunction', {
      principal: new iam.AnyPrincipal(),
      action: 'lambda:InvokeFunction',
    });

    storageBucket.grantReadWrite(backend);

    // Outputs
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
  }
}
