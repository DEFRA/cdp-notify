import { SNSClient } from '@aws-sdk/client-sns'

import { config } from '~/src/config/index.js'

const snsClient = {
  plugin: {
    name: 'sns-client',
    version: '1.0.0',
    register: function (server) {
      server.logger.info('Setting up sns-client')

      const client = new SNSClient({
        region: config.get('awsRegion'),
        endpoint: config.get('snsEndpoint')
      })

      server.logger.info('sns-client configured')
      server.decorate('request', 'snsClient', client)
      server.decorate('server', 'snsClient', client)

      server.events.on('stop', () => {
        server.logger.info(`Closing SNS client`)
        client.destroy()
      })
    }
  }
}

export { snsClient }
