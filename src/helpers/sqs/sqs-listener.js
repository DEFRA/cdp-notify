import { Consumer } from 'sqs-consumer'

import { config } from '~/src/config/index.js'
import { handleGrafanaEmailAlert } from '~/src/listeners/grafana/email/handle-grafana-email-alerts.js'
import { deleteSqsMessage } from '~/src/helpers/sqs/delete-sqs-message.js'
import { handle } from '~/src/listeners/github/message-handler.js'
import { handleGrafanaPagerDutyAlert } from '~/src/listeners/grafana/pagerduty/handle-grafana-pagerduty-alerts.js'

/**
 * @typedef {StopOptions} StopOptions
 */

const sqsListener = {
  plugin: {
    name: 'sqsListener',
    multiple: true,
    version: '0.1.0',
    register(server, options) {
      const queueUrl = options.config.queueUrl

      server.logger.info(`Listening for events on ${queueUrl}`)

      const listener = Consumer.create({
        queueUrl,
        messageAttributeNames: ['All'],
        waitTimeSeconds: options.config.waitTimeSeconds,
        pollingWaitTimeMs: options.config.pollingWaitTimeMs,
        visibilityTimeout: options.config.visibilityTimeout,
        handleMessage: (message) =>
          options.messageHandler(message, queueUrl, server),
        sqs: server.sqs
      })

      listener.on('error', (error) => {
        server.logger.error(error, `error ${queueUrl} : ${error.message}`)
      })

      listener.on('processing_error', (error) => {
        server.logger.error(
          error,
          `processing error ${queueUrl} : ${error.message}`
        )
      })

      listener.on('timeout_error', (error) => {
        server.logger.error(
          error,
          `timeout error ${queueUrl} : ${error.message}`
        )
      })

      server.events.on('closing', (/** @type {StopOptions} */ options) => {
        server.logger.info(`Closing sqs listener for ${queueUrl}`)
        listener.stop(options)
      })

      listener.start()
    }
  }
}

const grafanaAlertListener = {
  plugin: sqsListener,
  options: {
    config: config.get('sqsGrafanaAlerts'),
    messageHandler: async (message, queueUrl, server) => {
      try {
        await handleGrafanaEmailAlert(message, server)
      } catch (error) {
        server.logger.info(`Message body: ${message.Body}`)
        server.logger.error(error, `Email - SQS ${queueUrl}: ${error.message}`)
      }
      try {
        await handleGrafanaPagerDutyAlert(message)
        const receiptHandle = message.ReceiptHandle
        await deleteSqsMessage(server.sqs, queueUrl, receiptHandle)
      } catch (error) {
        server.logger.info(`Message body: ${message.Body}`)
        server.logger.error(
          error,
          `PagerDuty - SQS ${queueUrl}: ${error.message}`
        )
      }
    }
  }
}

const gitHubEventsListener = {
  plugin: sqsListener,
  options: {
    config: config.get('sqsGitHubEvents'),
    messageHandler: async (message, queueUrl, server) => {
      const payload = JSON.parse(message.Body)
      await handle(server, payload)
      return message
    }
  }
}

export { grafanaAlertListener, gitHubEventsListener }
/**
 * @import {StopOptions} from 'sqs-consumer'
 */
