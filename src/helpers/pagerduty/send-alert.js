import { proxyFetch } from '~/src/helpers/proxy.js'
import { config } from '~/src/config/index.js'

const url = config.get('pagerduty.url')

async function sendAlert(integrationKey, alert, teams, dedupeKey, eventAction) {
  const response = await proxyFetch(`${url}/v2/enqueue`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      payload: {
        timestamp: alert.startsAt,
        summary: alert.summary,
        severity: 'critical',
        source: 'grafana',
        custom_details: {
          teams,
          service: alert.service,
          environment: alert.environment
        }
      },
      routing_key: integrationKey,
      dedup_key: dedupeKey,
      event_action: eventAction,
      links: [
        {
          href: alert.alertURL,
          text: alert.alertURL
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(
      `HTTP Error Response: ${response.status} ${response.statusText}`
    )
  }
}

export { sendAlert }
