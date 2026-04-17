import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface NetworkStackProps extends cdk.StackProps {
  env_name: string;
  natGateways: number;
}

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly lambdaSg: ec2.SecurityGroup;
  public readonly redisSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: props.natGateways,
      subnetConfiguration: [
        { name: 'public',  subnetType: ec2.SubnetType.PUBLIC,           cidrMask: 24 },
        { name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
      ],
    });

    this.lambdaSg = new ec2.SecurityGroup(this, 'LambdaSg', {
      vpc: this.vpc, description: 'Lambda security group', allowAllOutbound: false,
    });

    this.redisSg = new ec2.SecurityGroup(this, 'RedisSg', {
      vpc: this.vpc, description: 'ElastiCache Redis security group', allowAllOutbound: false,
    });

    this.lambdaSg.addEgressRule(this.redisSg, ec2.Port.tcp(6379), 'Lambda to Redis');
    this.lambdaSg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Lambda to AWS services');
    this.redisSg.addIngressRule(this.lambdaSg, ec2.Port.tcp(6379), 'Redis from Lambda');

    // VPC endpoints — avoid internet traversal for Secrets Manager and CloudWatch
    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
    this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
  }
}
