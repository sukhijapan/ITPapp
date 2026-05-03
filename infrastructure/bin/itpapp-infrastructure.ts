#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ItpAppStack } from '../lib/itpapp-stack';

const app = new cdk.App();
new ItpAppStack(app, 'ItpAppStack', {
  env: { 
    account: '989346119403', 
    region: 'ap-southeast-2' // Fixed to Sydney for cost and residency
  },
});
