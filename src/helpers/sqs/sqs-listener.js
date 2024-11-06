import { Consumer } from 'sqs-consumer'

import { config } from '~/src/config/index.js'
import { handleGrafanaAlert } from '~/src/listeners/grafana/handle-grafana-alerts.js'
import { deleteSqsMessage } from '~/src/helpers/sqs/delete-sqs-message.js'

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
        // attributeNames: ['SentTimestamp'],
        messageAttributeNames: ['All'],
        waitTimeSeconds: options.config.waitTimeSeconds,
        pollingWaitTimeMs: options.config.pollingWaitTimeMs,
        visibilityTimeout: options.config.visibilityTimeout,
        handleMessage: (message) =>
          options.messageHandler(message, queueUrl, server),
        sqs: server.sqs
      })

      listener.on('error', (error) => {
        server.logger.error(`error ${queueUrl} : ${error.message}`)
      })

      listener.on('processing_error', (error) => {
        server.logger.error(`processing error ${queueUrl} : ${error.message}`)
      })

      listener.on('timeout_error', (error) => {
        server.logger.error(`timeout error ${queueUrl} : ${error.message}`)
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
        await handleGrafanaAlert(message, server)
      } catch (e) {
        server.logger.error(`SQS ${queueUrl} : ${e}`)
      } finally {
        const receiptHandle = message.ReceiptHandle
        await deleteSqsMessage(server.sqs, queueUrl, receiptHandle)
      }
    }
  }
}

export { grafanaAlertListener }
/**
 * @import {StopOptions} from 'sqs-consumer'
 */
