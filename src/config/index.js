import convict from 'convict'
import email from 'convict-format-with-validator'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const isProduction = process.env.NODE_ENV === 'production'
const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

convict.addFormats(email)

const config = convict({
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
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'cdp-notify'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.resolve(dirname, '../..')
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
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDev
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
    doc: 'Enable email alerts',
    format: Boolean,
    default: true,
    env: 'SEND_EMAIL_ALERTS'
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
  }
})

config.validate({ allowed: 'strict' })

export { config }
