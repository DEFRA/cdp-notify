import { ClientSecretCredential } from '@azure/identity'
import { Client } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import { config } from '~/src/config/index.js'
import { provideProxy } from '~/src/helpers/proxy.js'

const proxy = provideProxy()

const msGraphPlugin = {
  options: {
    azureTenantId: config.get('azureTenantId'),
    azureClientId: config.get('azureClientId'),
    azureClientSecret: config.get('azureClientSecret'),
    azureClientBaseUrl: config.get('azureClientBaseUrl'),
    scopes: { scopes: ['https://graph.microsoft.com/.default'] },
    proxyCredentials: proxy
      ? {
          proxyOptions: {
            host: proxy.url.href,
            port: proxy.port,
            username: proxy.url?.username,
            password: proxy.url?.password
          }
        }
      : {},
    fetchOptions: proxy
      ? {
          fetchOptions: {
            dispatcher: proxy.proxyAgent
          }
        }
      : {}
  },
  plugin: {
    name: 'ms-graph',
    version: '1.0.0',
    register: (server, options) => {
      server.logger.info('Setting up ms-graph')

      const credential = new ClientSecretCredential(
        options.azureTenantId,
        options.azureClientId,
        options.azureClientSecret,
        options.proxyCredentials
      )

      const authProvider = new TokenCredentialAuthenticationProvider(
        credential,
        options.scopes
      )

      const msGraph = Client.initWithMiddleware({
        debugLogging: true,
        authProvider,
        baseUrl: options.azureClientBaseUrl,
        ...options.fetchOptions
      })

      server.decorate('server', 'msGraph', msGraph)
      server.decorate('request', 'msGraph', msGraph)
    }
  }
}

export { msGraphPlugin }