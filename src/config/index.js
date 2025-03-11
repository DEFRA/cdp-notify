import { cwd } from 'node:process'
import convict from 'convict'
import email from 'convict-format-with-validator'

import { environments } from '~/src/config/environments.js'

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

convict.addFormats(email)
convict.addFormat({
  name: 'environment-array',
  validate: function (values) {
    const envs = Object.values(environments)
    const validEnvs = values.every((value) => envs.includes(value))
    if (!validEnvs) {
      throw new Error(
        `ALERT_ENVIRONMENTS environment variable contained unknown environments`
      )
    }
  },
  coerce: function (val) {
    return val.split(',')
  }
})

const config = convict({
  service: {
    name: {
      doc: 'Api Service Name',
      format: String,
      default: 'cdp-notify'
    },
    version: {
      doc: 'The service version, this variable is injected into your docker container in CDP environments',
      format: String,
      nullable: true,
      default: null,
      env: 'SERVICE_VERSION'
    },
    environment: {
      doc: 'The environment the app is running in',
      format: String,
      default: 'local',
      env: 'ENVIRONMENT'
    }
  },
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3007,
    env: 'PORT'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: cwd()
  },
  awsRegion: {
    doc: 'AWS region',
    format: String,
    default: 'eu-west-2',
    env: 'AWS_REGION'
  },
  sqsEndpoint: {
    doc: 'AWS SQS endpoint',
    format: String,
    default: 'http://127.0.0.1:4566',
    env: 'SQS_ENDPOINT'
  },
  snsEndpoint: {
    doc: 'AWS SNS endpoint',
    format: String,
    default: 'http://127.0.0.1:4566',
    env: 'SNS_ENDPOINT'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDevelopment
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    }
  },
  mongoUri: {
    doc: 'URI for mongodb',
    format: '*',
    default: 'mongodb://127.0.0.1:27017/',
    env: 'MONGO_URI'
  },
  mongoDatabase: {
    doc: 'database for mongodb',
    format: String,
    default: 'cdp-notify',
    env: 'MONGO_DATABASE'
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'CDP_HTTP_PROXY'
  },
  httpsProxy: {
    doc: 'HTTPS Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'CDP_HTTPS_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  sqsGrafanaAlerts: {
    queueUrl: {
      doc: 'Queue for virus scan results',
      format: String,
      default: 'cdp_grafana_alerts',
      env: 'GRAFANA_ALERTS_QUEUE_URL'
    },
    waitTimeSeconds: {
      doc: 'The duration for which the call will wait for a message to arrive in the queue before returning',
      format: Number,
      default: 20,
      env: 'GRAFANA_ALERTS_WAIT_TIME_SECONDS'
    },
    pollingWaitTimeMs: {
      doc: 'The duration to wait before re-polling the queue',
      format: Number,
      default: 0,
      env: 'GRAFANA_ALERTS_POLLING_WAIT_TIME_MS'
    }
  },
  userServiceBackendUrl: {
    doc: 'User Service Backend url',
    format: String,
    default: 'http://localhost:3001',
    env: 'USER_SERVICE_BACKEND_URL'
  },
  portalBackendUrl: {
    doc: 'Portal backend for deployments and deployables root API url',
    format: String,
    default: 'http://localhost:5094',
    env: 'PORTAL_BACKEND_URL'
  },
  sendEmailAlerts: {
    doc: 'Enable sending emails',
    format: Boolean,
    default: true,
    env: 'SEND_EMAIL_ALERTS'
  },
  alertEnvironments: {
    doc: 'list of environments to alert on',
    format: 'environment-array',
    default: ['prod'],
    env: 'ALERT_ENVIRONMENTS'
  },
  senderEmailAddress: {
    doc: 'Defra email address used for sending emails',
    format: 'email',
    default: 'CDP-Alerts@defra.gov.uk',
    env: 'SENDER_EMAIL_ADDRESS'
  },
  azureClientBaseUrl: {
    doc: 'MsGraph api endpoint',
    format: String,
    env: 'AZURE_CLIENT_BASE_URL',
    default: 'http://localhost:3939/msgraph/'
  },
  azureTenantId: {
    doc: 'Azure Active Directory Tenant ID',
    format: String,
    env: 'AZURE_TENANT_ID',
    default: '770a2450-0227-4c62-90c7-4e38537f1102'
  },
  azureClientId: {
    doc: 'Azure App Client ID',
    format: String,
    env: 'AZURE_CLIENT_ID',
    default: '475f5e4c-d36e-4998-824c-c01fa4f396df'
  },
  azureClientSecret: {
    doc: 'Azure App Client Secret',
    format: String,
    sensitive: true,
    env: 'AZURE_CLIENT_SECRET',
    default: 'test_value'
  },
  nunjucks: {
    watch: {
      doc: 'Reload templates when they are changed.',
      format: Boolean,
      default: isDevelopment
    },
    noCache: {
      doc: 'Use a cache and recompile templates each time',
      format: Boolean,
      default: isDevelopment
    }
  },
  github: {
    repos: {
      cdpTfSvcInfra: {
        doc: 'GitHub repo for cdp-tf-svc-infra',
        format: String,
        default: 'cdp-tf-svc-infra',
        env: 'GITHUB_REPO_TF_SVC_INFRA'
      }
    },
    failedWorkflows: {
      infra: {
        slackChannel: {
          doc: 'Slack Channel for failed infra workflows',
          format: String,
          default: 'cdp-infra-workflow-failures',
          env: 'INFRA_FLOW_SLACK_CHANNEL'
        },
        repos: {
          doc: 'List of repos',
          format: Array,
          default: [
            'cdp-iam-users',
            'cdp-tf-core',
            'cdp-tf-svc-infra',
            'cdp-tf-modules',
            'cdp-tf-pagerduty',
            'cdp-tf-vanity-urls',
            'cdp-waf',
            'cdp-grafana-core',
            'cdp-grafana-modules',
            'cdp-grafana-svc',
            'cdp-opensearch-core',
            'cdp-opensearch-svc',
            'cdp-clamav-docker',
            'cdp-percona-mongo',
            'cdp-ssl-sidecar',
            'cdp-squid-proxy',
            'cdp-nginx-upstreams'
          ],
          env: 'INFRA_FLOW_REPOS'
        }
      },
      createService: {
        slackChannel: {
          doc: 'Slack Channel for failed workflows involved in creating a service',
          format: String,
          default: 'cdp-platform-alerts',
          env: 'CREATE_FLOW_SLACK_CHANNEL'
        },
        repos: {
          doc: 'List of repos',
          format: Array,
          default: [
            'cdp-nginx-upstreams',
            'cdp-tf-svc-infra',
            'cdp-grafana-svc',
            'cdp-squid-proxy',
            'cdp-create-workflows',
            'cdp-app-config',
            'cdp-app-deployments'
          ],
          env: 'CREATE_FLOW_REPOS'
        }
      },
      portalJourney: {
        slackChannel: {
          doc: 'Slack Channel for alerts for failed Portal journey tests',
          format: String,
          default: 'cdp-platform-alerts',
          env: 'PORTAL_JOURNEY_TESTS_SLACK_CHANNEL'
        },
        name: {
          doc: 'GitHub Workflow name for Portal journey tests',
          format: String,
          default: 'Journey Tests',
          env: 'PORTAL_JOURNEY_TESTS_WORKFLOW_NAME'
        }
      }
    }
  },
  slack: {
    snsCdpNotificationArn: {
      doc: 'SNS CDP Notification Topic ARN',
      format: String,
      default: 'arn:aws:sns:eu-west-2:000000000000:cdp-notification',
      env: 'SNS_CDP_NOTIFICATION_TOPIC_ARN'
    },
    sendFailedActionNotification: {
      doc: 'Send notification for failed GitHub Action',
      format: Boolean,
      default: true,
      env: 'SEND_FAILED_ACTION_NOTIFICATION'
    }
  },
  sqsGitHubEvents: {
    queueUrl: {
      doc: 'URL of sqs queue providing gitHub events',
      format: String,
      default: 'cdp-notify-github-events',
      env: 'SQS_GITHUB_QUEUE'
    },
    waitTimeSeconds: {
      doc: 'The duration for which the call will wait for a message to arrive in the queue before returning',
      format: Number,
      default: 10,
      env: 'SQS_GITHUB_WAIT_TIME_SECONDS'
    },
    visibilityTimeout: {
      doc: 'The duration (in seconds) that the received messages are hidden from subsequent retrieve requests after being retrieved by a ReceiveMessage request.',
      format: Number,
      default: 400,
      env: 'SQS_GITHUB_VISIBILITY_TIMEOUT'
    },
    pollingWaitTimeMs: {
      doc: 'The duration to wait before repolling the queue',
      format: Number,
      default: 0,
      env: 'SQS_GITHUB_POLLING_WAIT_TIME_MS'
    },
    enabled: {
      doc: 'Should the service listen for gitHub webhook events?',
      format: Boolean,
      default: true,
      env: 'SQS_GITHUB_ENABLED'
    }
  },
  pagerduty: {
    url: {
      doc: 'PagerDuty Url',
      format: String,
      default: 'https://events.eu.pagerduty.com',
      env: 'PAGERDUTY_URL'
    },
    sendAlerts: {
      doc: 'Should send PagerDuty alerts?',
      format: Boolean,
      default: false,
      env: 'SEND_PAGERDUTY_ALERT'
    },
    teams: {
      platform: {
        integrationKey: {
          doc: 'Integration key for digital service',
          format: String,
          default: 'key',
          env: 'PLATFORM_INTEGRATION_KEY'
        }
      },
      'platform-tenant-cko': {
        integrationKey: {
          doc: 'Integration key for digital service',
          format: String,
          default: 'key',
          env: 'PLATFORM_TENANT_CKO_INTEGRATION_KEY'
        }
      }
    },
    services: {
      'cdp-backup': {
        integrationKey: {
          doc: 'Integration key for digital service',
          format: String,
          default: 'key',
          env: 'CDP_BACKUP_INTEGRATION_KEY'
        }
      },
      'cdp-elasticache': {
        integrationKey: {
          doc: 'Integration key for digital service',
          format: String,
          default: 'key',
          env: 'CDP_ELASTICACHE_INTEGRATION_KEY'
        }
      },
      'cdp-lambda': {
        integrationKey: {
          doc: 'Integration key for digital service',
          format: String,
          default: 'key',
          env: 'CDP_LAMBDA_INTEGRATION_KEY'
        }
      },
      'cdp-nginx-proxy': {
        integrationKey: {
          doc: 'Integration key for digital service',
          format: String,
          default: 'key',
          env: 'CDP_NGINX_PROXY_INTEGRATION_KEY'
        }
      },
      'cdp-opensearch-cluster': {
        integrationKey: {
          doc: 'Integration key for digital service',
          format: String,
          default: 'key',
          env: 'CDP_OPENSEARCH_CLUSTER_INTEGRATION_KEY'
        }
      },
      'cdp-opensearch-ingestion': {
        integrationKey: {
          doc: 'Integration key for digital service',
          format: String,
          default: 'key',
          env: 'CDP_OPENSEARCH_INGESTION_INTEGRATION_KEY'
        }
      },
      'cdp-protected-mongo': {
        integrationKey: {
          doc: 'Integration key for digital service',
          format: String,
          default: 'key',
          env: 'CDP_PROTECTED_MONGO_INTEGRATION_KEY'
        }
      },
      'cdp-squid-proxy': {
        integrationKey: {
          doc: 'Integration key for digital service',
          format: String,
          default: 'key',
          env: 'CDP_SQUID_PROXY_INTEGRATION_KEY'
        }
      },
      'cdp-waf': {
        integrationKey: {
          doc: 'Integration key for digital service',
          format: String,
          default: 'key',
          env: 'CDP_WAF_INTEGRATION_KEY'
        }
      }
    }
  }
})

config.validate({ allowed: 'strict' })

export { config }
