import path from 'path'
import hapi from '@hapi/hapi'

import { config } from '~/src/config/index.js'
import { router } from '~/src/api/router.js'
import { requestLogger } from '~/src/helpers/logging/request-logger.js'
import { mongoDb } from '~/src/helpers/mongodb.js'
import { failAction } from '~/src/helpers/fail-action.js'
import { secureContext } from '~/src/helpers/secure-context/index.js'
import { pulse } from '~/src/helpers/pulse.js'
import {
  grafanaAlertListener,
  gitHubEventsListener
} from '~/src/helpers/sqs/sqs-listener.js'
import { msGraphPlugin } from '~/src/helpers/ms-graph/ms-graph.js'
import { sqsClient } from '~/src/helpers/sqs/sqs-client.js'
import { snsClient } from '~/src/helpers/sns/sns-client.js'

async function createServer() {
  const server = hapi.server({
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        },
        failAction
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  // Hapi Plugins:
  // requestLogger - automatically logs incoming requests
  // secureContext - loads CA certificates from environment config
  // pulse         - provides shutdown handlers
  // mongoDb       - sets up mongo connection pool and attaches to `server` and `request` objects
  // router        - routes used in the app
  await server.register([
    requestLogger,
    secureContext,
    pulse,
    msGraphPlugin,
    mongoDb,
    sqsClient,
    snsClient,
    grafanaAlertListener,
    router
  ])

  if (config.get('sqsGitHubEvents.enabled')) {
    await server.register(gitHubEventsListener)
  }

  return server
}

export { createServer }
