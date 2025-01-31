import { config } from '~/src/config/index.js'
import { serviceToPagerDutyServiceOverride } from '~/src/config/pagerduty-service-override.js'
import { sendAlert } from '~/src/helpers/pagerduty/send-alert.js'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'
import { fetchTeam } from '~/src/helpers/fetch/fetch-team.js'
import crypto from 'crypto'

const sendAlerts = config.get('pagerduty.sendAlerts')

function createDedupeKey(payload) {
  const str = `${payload.summary}${payload.service}${payload.environment}${payload.startsAt}`
  return crypto.createHash('md5').update(str).digest('hex')
}

/**
 *
 * @param {Alert} alert
 * @returns {boolean}
 */
function shouldSendAlert(alert) {
  const overrides =
    serviceToPagerDutyServiceOverride[alert.service]?.environments

  const alertEnvironments = overrides || config.get('alertEnvironments')
  return alertEnvironments.includes(alert.environment)
}

async function getTeams(alert, logger) {
  let teams = serviceToPagerDutyServiceOverride[alert.service]?.teams

  if (teams) {
    return teams
  }

  const service = await fetchService(alert.service)
  if (!service?.teams) {
    logger.info(
      `service ${alert.service} was not found:\n${JSON.stringify(alert)}`
    )

    return []
  }
  teams = service.teams.map(async (team) => await fetchTeam(team.teamId))
  return await Promise.all(teams)
}

function findIntegrationKeyForTeam(team) {
  return config.get(`pagerduty.teams.${team}.integrationKey`)
}

// If there is an integration key, it's assumed that we should send a PagerDuty alert
function findIntegrationKeyForService(alert) {
  const overrides =
    serviceToPagerDutyServiceOverride[alert.service]?.technicalService

  const service = overrides || alert.service

  return config.get(`pagerduty.services.${service}.integrationKey`)
}

async function handleGrafanaPagerDutyAlert(message, server) {
  const logger = server.logger
  const payload = JSON.parse(message.Body)

  if (!shouldSendAlert(payload)) {
    return
  }

  if (!payload?.service) {
    logger.warn(
      `alert did not contain a service field:\n${JSON.stringify(payload)}`
    )
    return []
  }

  const teams = await getTeams(payload, logger)

  let integrationKeys = teams
    .map((team) => findIntegrationKeyForTeam(team))
    .filter((t) => t)

  if (!integrationKeys) {
    integrationKeys = [findIntegrationKeyForService(payload, server.logger)]
  }

  if (!integrationKeys.length) {
    server.logger.debug(
      `No integration key found for ${payload.service}. Not sending alert - MessageId: ${message.MessageId}`
    )
    return
  }

  server.logger.info(
    `Grafana alert ${payload.status} for ${payload.service} in ${payload.environment} - Alert: ${payload.alertName} MessageId: ${message.MessageId}`
  )

  if (sendAlerts) {
    server.logger.info('Sending PagerDuty alert')

    let eventAction

    if (payload.status === 'firing') {
      eventAction = 'trigger'
    } else if (payload.status === 'resolved') {
      eventAction = 'resolve'
    } else {
      server.logger.warn(
        `Unexpected status ${payload.status} not sending alert:\n${JSON.stringify(payload)}`
      )
      return
    }

    const dedupeKey = createDedupeKey(payload)

    const alerts = integrationKeys.map(async (integrationKey) => {
      await sendAlert(integrationKey, payload, teams, dedupeKey, eventAction)
    })
    await Promise.all(alerts)
  }
}

export { handleGrafanaPagerDutyAlert }
