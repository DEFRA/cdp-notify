import { Consumer } from 'sqs-consumer'

import { config } from '~/src/config/index.js'
import { handleGrafanaEmailAlert } from '~/src/listeners/grafana/email/handle-grafana-email-alerts.js'
import { deleteSqsMessage } from '~/src/helpers/sqs/delete-sqs-message.js'
import { handle } from '~/src/listeners/github/message-handler.js'
import { handleGrafanaPagerDutyAlert } from '~/src/listeners/grafana/pagerduty/handle-grafana-pagerduty-alerts.js'
import { sendAlertForCdpNotify } from '~/src/helpers/pagerduty/send-alert.js'
import crypto from 'crypto'

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

function filterDuplicateAlerts(list) {
  const seen = new Set()
  return list.filter((item) => {
    const str = `${item?.service}${item?.environment}${item?.alertURL}${item?.status}${item?.startsAt}${item.endsAt}`
    const hash = crypto.createHash('md5').update(str).digest('hex')
    if (seen.has(hash)) return false
    seen.add(item.hash)
    return true
  })
}

function createAlertLogger(message, category, logger) {
  return logger.child({
    event: {
      kind: message.Body,
      category,
      reference: message.MessageId
    }
  })
}

const grafanaAlertListener = {
  plugin: sqsListener,
  options: {
    config: config.get('sqsGrafanaAlerts'),
    messageHandler: async (message, queueUrl, server) => {
      try {
        server.logger.info(`Handling message ${message.MessageId}`)
        const payload = JSON.parse(message.Body)
        const alerts = filterDuplicateAlerts(
          Array.isArray(payload) ? payload : [payload]
        )

        let logger
        try {
          logger = createAlertLogger(message, 'email', server.logger)
          const emailAlerts = alerts.map(
            async (alert) =>
              await handleGrafanaEmailAlert(alert, logger, server.msGraph)
          )
          await Promise.all(emailAlerts)
        } catch (error) {
          logger.error(error, `Email - SQS ${queueUrl}: ${error.message}`)
        }

        logger = createAlertLogger(message, 'PagerDuty', server.logger)
        const pagerDutyAlerts = alerts.map(
          async (alert) => await handleGrafanaPagerDutyAlert(alert, logger)
        )
        await Promise.all(pagerDutyAlerts)
      } catch (error) {
        const logger = createAlertLogger(message, 'PagerDuty', server.logger)
        logger.error(error, `PagerDuty - SQS ${queueUrl}: ${error.message}`)
        await sendAlertForCdpNotify(
          `Failed to process SQS message: ${error.message}`
        )
      } finally {
        const receiptHandle = message.ReceiptHandle
        await deleteSqsMessage(server.sqs, queueUrl, receiptHandle)
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
