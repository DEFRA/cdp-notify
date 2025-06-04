import { proxyFetch } from '~/src/helpers/proxy.js'
import { config } from '~/src/config/index.js'

const url = config.get('pagerduty.url')

async function sendAlert(
  payload,
  dedupeKey,
  integrationKey,
  eventAction,
  alertURL
) {
  const response = await proxyFetch(`${url}/v2/enqueue`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      payload,
      routing_key: integrationKey,
      dedup_key: dedupeKey,
      event_action: eventAction,
      links: [
        {
          href: alertURL,
          text: alertURL
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(
      `HTTP Error Response: ${response.status} ${await response.text()}`
    )
  }
  return response
}

export { sendAlert }
