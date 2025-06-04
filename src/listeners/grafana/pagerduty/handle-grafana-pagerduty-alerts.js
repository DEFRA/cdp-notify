import { config } from '~/src/config/index.js'
import { serviceToTeamOverride } from '~/src/config/service-override.js'
import { sendAlert } from '~/src/helpers/pagerduty/send-alert.js'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'

import crypto from 'crypto'

/**
 * Generates a pagerduty dedupe key based off the message's content.
 * @param {{summary: string, service: string, environment: string, alertURL: string}|null} payload
 * @returns {string}
 */
export function createDedupeKey(payload) {
  const str = `${payload?.service}${payload?.environment}${payload?.alertURL}`
  return crypto.createHash('md5').update(str).digest('hex')
}

/**
 * Decides if an alert should be sent based off the environment it originated in.
 * @param {Alert} alert
 * @param {string[]} environments
 * @returns {boolean}
 */
export function shouldSendAlert(alert, environments) {
  const overrides = serviceToTeamOverride[alert.service]?.environments

  const alertEnvironments = overrides || environments
  return alertEnvironments.includes(alert.environment)
}

/**
 * Gets the teams associated to an alert.
 * Uses overrides first if set, otherwise uses owners of service from portal-backend.
 * @param {string} serviceName
 * @param {Logger} logger
 * @returns {Promise<string[]>}
 */
export async function getTeams(serviceName, logger) {
  const teams = serviceToTeamOverride[serviceName]?.teams

  if (teams) {
    return teams
  }

  const service = await fetchService(serviceName)
  if (!service?.teams) {
    logger.info(`service ${serviceName} was not found`)
    return []
  }

  return service.teams.map((team) => team.name.toLowerCase())
}

/**
 * Gets integration key for a team from config.js
 * @param {string} team
 * @returns {string|null}
 */
function findIntegrationKeyForTeam(team) {
  try {
    return config.get(`pagerduty.teams.${team}.integrationKey`)
  } catch {
    return null
  }
}

/**
 * If there is an integration key, it's assumed that we should send a PagerDuty alert
 * @param {Alert} alert
 * @returns {string|null}
 */
export function findIntegrationKeyForService(alert) {
  const overrides = serviceToTeamOverride[alert.service]?.technicalService

  const service = overrides || alert.service

  try {
    return config.get(`pagerduty.services.${service}.integrationKey`)
  } catch {
    return null
  }
}

function outcomeLogger(outcome, payload, logger) {
  return logger.child({
    event: {
      outcome
    },
    tenant: {
      message: payload
    }
  })
}

/**
 *
 * @param {{MessageId: string, Body: string}} message
 * @param {Logger} logger
 * @returns {Promise<void>}
 */
export async function handleGrafanaPagerDutyAlert(message, logger) {
  const grafanaAlert = JSON.parse(message.Body)

  // reject alerts that are not flagged for pagerDuty
  if (grafanaAlert?.pagerDuty !== 'true') {
    logger.info(`ignoring alert does not have a pagerDuty=true label`)
    return
  }

  if (!shouldSendAlert(grafanaAlert, config.get('alertEnvironments'))) {
    return
  }

  if (!grafanaAlert?.service) {
    logger.warn(`alert did not contain a service field`)
    return
  }

  const teams = await getTeams(grafanaAlert.service, logger)

  const integrationKeys = teams
    .map((team) => findIntegrationKeyForTeam(team))
    .filter((t) => t)

  if (integrationKeys.length === 0) {
    const key = findIntegrationKeyForService(grafanaAlert)
    if (key) {
      integrationKeys.push(key)
    }
  }

  if (integrationKeys.length === 0) {
    logger.info(
      `No integration key found for ${grafanaAlert.service}. Not sending alert`
    )
    return
  }

  let eventAction
  let timestamp

  if (grafanaAlert.status === 'firing') {
    eventAction = 'trigger'
    timestamp = grafanaAlert.startsAt
  } else if (grafanaAlert.status === 'resolved') {
    eventAction = 'resolve'
    timestamp = grafanaAlert.endsAt
  } else {
    logger.warn(`Unexpected status ${grafanaAlert.status} not sending alert`)
    return
  }

  const dedupeKey = createDedupeKey(grafanaAlert)

  const payload = {
    timestamp,
    summary: grafanaAlert.summary,
    severity: 'critical',
    source: 'grafana',
    custom_details: {
      teams,
      service: grafanaAlert.service,
      environment: grafanaAlert.environment
    }
  }

  if (config.get('pagerduty.sendAlerts')) {
    const alerts = integrationKeys.map(async (integrationKey) => {
      const resp = await sendAlert(
        payload,
        dedupeKey,
        integrationKey,
        eventAction,
        grafanaAlert.alertURL
      )
      const respText = await resp.text()

      outcomeLogger('alert sent', payload, logger).info(
        `sending PagerDuty alert with dedupe ${dedupeKey}. pagerdutyResponse: ${respText}`
      )
    })
    const result = await Promise.allSettled(alerts)
    result
      .filter((r) => r.status === 'rejected')
      .forEach((r) => {
        outcomeLogger('alert not sent', payload, logger).error(
          `failed to send pager duty alert! ${r.reason}`
        )
      })
  } else {
    outcomeLogger('alert not sent', payload, logger).warn(
      'NOT Sending PagerDuty alert (sendAlerts disabled in config)'
    )
  }
}

/**
 * @import { Logger } from 'pino'
 */
