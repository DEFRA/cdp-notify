import { Consumer } from 'sqs-consumer'

import { config } from '~/src/config/index.js'
import { handle } from '~/src/listeners/github/message-handler.js'

const sqsListener = {
  plugin: {
    name: 'sqsListener',
    multiple: true,
    version: '0.1.0',
    register: (server, options) => {
      const queueUrl = options.config.queueUrl

      server.logger.info(`Listening for scan result events on ${queueUrl}`)

      const listener = Consumer.create({
        queueUrl,
        attributeNames: ['SentTimestamp'],
        messageAttributeNames: ['All'],
        waitTimeSeconds: options.config.waitTimeSeconds,
        pollingWaitTimeMs: options.config.pollingWaitTimeMs,
        visibilityTimeout: options.config.visibilityTimeout,
        handleMessage: (message) =>
          options.messageHandler(message, queueUrl, server),
        sqs: server.sqs
      })

      listener.on('error', (error) => {
        server.logger.error(`Error ${queueUrl} : ${error.message}`)
      })

      listener.on('processing_error', (error) => {
        server.logger.error(`Processing error ${queueUrl} : ${error.message}`)
      })

      listener.on('timeout_error', (error) => {
        server.logger.error(`Timeout error ${queueUrl} : ${error.message}`)
      })

      server.events.on('closing', () => {
        server.logger.info(`Closing SQS Listener for ${queueUrl}`)
        listener.stop()
      })

      listener.start()
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

export { gitHubEventsListener }
