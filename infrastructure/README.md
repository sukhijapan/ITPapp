# AWS CDK Infrastructure for ITPapp

This project contains the AWS CDK infrastructure for the ITPapp, optimized for extreme cost-efficiency during the POC phase.

## Cost-Optimized Architecture (Sydney: ap-southeast-2)

1. **VPC:** Single Public Subnet configuration. **Saves ~$32/month** by avoiding NAT Gateways.
2. **Database:** RDS `t4g.micro` (PostgreSQL 16). Fixed cost of **~$15/month**.
3. **Backend:** Lambda with **Function URLs**. **Saves ~$3.50/month** by avoiding API Gateway.
4. **Storage:** S3 for media and reports. Pay-per-use (pennies/month).

## Prerequisites

1. AWS CLI configured with credentials.
2. Node.js 18+ installed.
3. [CDK CLI](https://docs.aws.amazon.com/cdk/v2/guide/cli.html) installed: `npm install -g aws-cdk`

## Deployment Steps

1. **Bootstrap AWS Account (First time only):**
   ```bash
   npx cdk bootstrap
   ```

2. **Synthesize Template:**
   ```bash
   npx cdk synth
   ```

3. **Deploy Stack:**
   ```bash
   npx cdk deploy
   ```

## Post-Deployment

1. The deployment will output an `ApiUrl`. Update your frontend `.env` with this value.
2. You will need to initialize the remote database schema. Since the DB is in a public subnet (protected by Security Groups), you can connect to it from your local machine to run the initialization script.

## Security Note for POC
The RDS instance is in a public subnet to save NAT Gateway costs. It is protected by a Security Group that only allows traffic from the Lambda and your specific IP (if added). For production, a NAT Gateway and private subnets are recommended despite the cost.
