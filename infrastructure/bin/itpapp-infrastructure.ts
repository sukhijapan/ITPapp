#!/usr/bin/env node
import 'source-map-support/register';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as cdk from 'aws-cdk-lib';

// Load deployment secrets from infrastructure/.env (gitignored, never committed)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { ItpAppStack } from '../lib/itpapp-stack';

const app = new cdk.App();
new ItpAppStack(app, 'ItpAppStack', {
  env: { 
    account: '989346119403', 
    region: 'ap-southeast-2' // Fixed to Sydney for cost and residency
  },
});
