import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ItpAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. VPC - Configured for absolute minimum cost
    // We use a public subnet for RDS to avoid NAT Gateway costs (~$32/mo saved)
    const vpc = new ec2.Vpc(this, 'ItpVpc', {
      maxAzs: 2,
      natGateways: 0, // CRITICAL: NAT Gateways are expensive.
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
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'], // Restrict this in production
        allowedHeaders: ['*'],
      }],
    });

    // 3. Security Groups
    const lambdaSG = new ec2.SecurityGroup(this, 'LambdaSG', { vpc });
    const dbSG = new ec2.SecurityGroup(this, 'DbSG', { vpc });
    
    // Only allow Lambda to talk to Database
    dbSG.addIngressRule(lambdaSG, ec2.Port.tcp(5432), 'Allow Lambda access to Postgres');

    // 4. RDS Database - The only significant fixed cost (~$15/mo)
    const database = new rds.DatabaseInstance(this, 'ItpDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.of('16.6', '16') }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }, // Placing in public to save NAT costs
      securityGroups: [dbSG],
      allocatedStorage: 20, // Minimum
      maxAllocatedStorage: 20, // Prevent auto-scaling costs
      databaseName: 'itpapp',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
      backupRetention: cdk.Duration.days(1), // Minimal backups for cost
    });

    // 5. Backend Lambda
    const backend = new lambda.Function(this, 'ItpBackend', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend'), // Point to your local backend folder
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true, // Lambda won't have internet access, but can reach RDS in the same VPC
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        DB_HOST: database.instanceEndpoint.hostname,
        DB_NAME: 'itpapp',
        DB_USER: 'postgres', // Credentials should ideally come from Secrets Manager, but for POC we use envs
        STORAGE_BUCKET: storageBucket.bucketName,
        NODE_ENV: 'production',
      },
    });

    // 6. Lambda Function URL (Saves cost of API Gateway)
    const fnUrl = backend.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE, // We handle JWT auth inside the app
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['*'],
      },
    });

    // Permissions
    storageBucket.grantReadWrite(backend);

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: fnUrl.url,
      description: 'The URL of the Backend API',
    });
  }
}
