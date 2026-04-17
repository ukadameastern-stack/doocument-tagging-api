import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { AppStack } from '../lib/app-stack';

const app = new cdk.App();
const envName = app.node.tryGetContext('deployEnv') ?? 'dev';
const ctx = app.node.tryGetContext(envName) ?? {};

const awsEnv = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1' };

const networkStack = new NetworkStack(app, `orders-api-network-${envName}`, {
  env_name: envName,
  natGateways: ctx.natGateways ?? 1,
  env: awsEnv,
});

new AppStack(app, `orders-api-app-${envName}`, {
  env_name: envName,
  provisionedConcurrency: ctx.provisionedConcurrency ?? 0,
  networkStack,
  env: awsEnv,
});
