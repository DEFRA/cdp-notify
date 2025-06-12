import { proxyFetch } from '~/src/helpers/proxy.js'
import { config } from '~/src/config/index.js'

const url = config.get('pagerduty.url')

async function sendAlert(
  alert,
  teams,
  eventAction,
  timestamp,
  dedupeKey,
  integrationKey,
  logger
) {
  const payload = {
    timestamp,
    summary: alert.summary,
    severity: 'critical',
    source: 'grafana',
    custom_details: {
      teams,
      service: alert.service,
      environment: alert.environment
    }
  }

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
      ...(alert?.alertURL && {
        links: [
          {
            href: alert.alertURL,
            text: alert.alertURL
          }
        ]
      })
    })
  })

  if (!response.ok) {
    const error = `HTTP Error Response: ${response.status} ${await response.text()}`
    logger.error(
      {
        event: {
          ...logger.bindings().event,
          outcome: 'Alert not sent',
          reason: 'PagerDuty API failure'
        },
        tenant: {
          message: JSON.stringify(payload)
        }
      },
      error
    )
    await sendAlertForCdpNotify('PagerDuty API returned error')
    throw new Error(error)
  }
  return response
}

async function sendAlertForCdpNotify(summary) {
  const serviceConfig = config.get('service')
  const team = 'Platform'
  const integrationKey = config.get(`pagerduty.teams.${team}.integrationKey`)

  return await proxyFetch(`${url}/v2/enqueue`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      payload: {
        timestamp: new Date().toISOString(),
        summary,
        severity: 'critical',
        source: 'cdp-notify',
        custom_details: {
          teams: [team],
          service: serviceConfig.name,
          environment: serviceConfig.environment
        }
      },
      routing_key: integrationKey,
      event_action: 'trigger'
    })
  })
}

export { sendAlert, sendAlertForCdpNotify }
