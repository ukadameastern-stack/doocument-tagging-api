import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { NetworkStack } from './network-stack';

interface AppStackProps extends cdk.StackProps {
  env_name: string;
  provisionedConcurrency: number;
  networkStack: NetworkStack;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const { env_name, networkStack, provisionedConcurrency } = props;
    const logRetention = env_name === 'prod' ? logs.RetentionDays.THREE_MONTHS
      : env_name === 'staging' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK;

    // Secrets
    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      secretName: `orders-api/${env_name}/jwt-secret`,
      generateSecretString: { secretStringTemplate: JSON.stringify({ secret: '' }), generateStringKey: 'secret', excludePunctuation: true },
    });
    const mongoSecret = new secretsmanager.Secret(this, 'MongoSecret', { secretName: `orders-api/${env_name}/mongodb-uri` });
    const redisSecret = new secretsmanager.Secret(this, 'RedisSecret', { secretName: `orders-api/${env_name}/redis-url` });

    // ElastiCache Serverless (prod/staging)
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Redis subnet group',
      subnetIds: networkStack.vpc.privateSubnets.map((s) => s.subnetId),
    });
    new elasticache.CfnServerlessCache(this, 'Redis', {
      serverlessCacheName: `orders-api-${env_name}`,
      engine: 'redis',
      subnetIds: networkStack.vpc.privateSubnets.map((s) => s.subnetId),
      securityGroupIds: [networkStack.redisSg.securityGroupId],
    });

    // IAM execution role
    const executionRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')],
    });
    [jwtSecret, mongoSecret, redisSecret].forEach((s) =>
      s.grantRead(executionRole),
    );

    // Lambda function
    const fn = new lambda.Function(this, 'OrdersApi', {
      functionName: `orders-api-${env_name}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'server.lambdaHandler',
      code: lambda.Code.fromAsset('../dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      role: executionRole,
      vpc: networkStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [networkStack.lambdaSg],
      environment: {
        NODE_ENV: env_name === 'dev' ? 'development' : 'production',
        SECRETS_JWT_SECRET_NAME: jwtSecret.secretName,
        SECRETS_MONGODB_URI_NAME: mongoSecret.secretName,
        SECRETS_REDIS_URL_NAME: redisSecret.secretName,
        JWT_AUDIENCE: 'orders-api', JWT_ISSUER: 'orders-api',
      },
      logRetention,
    });

    // Provisioned concurrency (prod only)
    if (provisionedConcurrency > 0) {
      const alias = new lambda.Alias(this, 'ProdAlias', { aliasName: 'production', version: fn.currentVersion });
      new lambda.CfnProvisionedConcurrencyConfig(this, 'ProvisionedConcurrency', {
        functionName: fn.functionName,
        qualifier: alias.aliasName,
        provisionedConcurrentExecutions: provisionedConcurrency,
      });
    }

    // API Gateway HTTP API
    const httpApi = new apigateway.HttpApi(this, 'HttpApi', {
      apiName: `orders-api-${env_name}`,
      defaultIntegration: new integrations.HttpLambdaIntegration('LambdaIntegration', fn),
      corsPreflight: {
        allowOrigins: env_name === 'dev' ? ['*'] : [`https://api-${env_name}.example.com`],
        allowMethods: [apigateway.CorsHttpMethod.ANY],
        allowHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
        allowCredentials: true,
      },
    });

    // CloudWatch Alarms (prod/staging)
    if (env_name !== 'dev') {
      const alarmTopic = new sns.Topic(this, 'AlarmTopic', { topicName: `orders-api-alarms-${env_name}` });
      new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
        metric: fn.metricErrors({ period: cdk.Duration.minutes(5) }),
        threshold: 1, evaluationPeriods: 1,
        alarmDescription: 'Lambda error rate > 1%',
      }).addAlarmAction({ bind: () => ({ alarmActionArn: alarmTopic.topicArn }) });

      new cloudwatch.Alarm(this, 'LatencyAlarm', {
        metric: fn.metricDuration({ statistic: 'p95', period: cdk.Duration.minutes(5) }),
        threshold: 1000, evaluationPeriods: 1,
        alarmDescription: 'Lambda p95 duration > 1000ms',
      });

      // Dashboard
      new cloudwatch.Dashboard(this, 'Dashboard', {
        dashboardName: `orders-api-${env_name}`,
        widgets: [[
          new cloudwatch.GraphWidget({ title: 'Invocations & Errors', left: [fn.metricInvocations(), fn.metricErrors()] }),
          new cloudwatch.GraphWidget({ title: 'Duration p95', left: [fn.metricDuration({ statistic: 'p95' })] }),
        ]],
      });
    }

    new cdk.CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint });
  }
}
