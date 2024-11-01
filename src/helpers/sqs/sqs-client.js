import { SQSClient } from '@aws-sdk/client-sqs'
import { config } from '~/src/config/index.js'

const sqsClient = {
  options: {
    region: config.get('awsRegion'),
    endpoint: config.get('sqsEndpoint')
  },
  plugin: {
    name: 'sqsClient',
    version: '0.1.0',
    register(server, options) {
      const sqsClient = new SQSClient({
        region: options.region,
        endpoint: options.endpoint
      })

      server.decorate('server', 'sqs', sqsClient)

      server.events.on('stop', () => {
        server.logger.info(`Closing sqs client`)
        sqsClient.destroy()
      })
    }
  }
}

export { sqsClient }
