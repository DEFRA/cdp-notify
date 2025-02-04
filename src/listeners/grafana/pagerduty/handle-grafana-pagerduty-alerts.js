import { config } from '~/src/config/index.js'
import { serviceToPagerDutyServiceOverride } from '~/src/config/pagerduty-service-override.js'
import { sendAlert } from '~/src/helpers/pagerduty/send-alert.js'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'

import crypto from 'crypto'
import { createLogger } from '~/src/helpers/logging/logger.js'

const logger = createLogger()

/**
 * Generates a pagerduty dedupe key based off the message's content.
 * @param {{summary: string, service: string, environment: string, startsAt: string}|null} payload
 * @returns {string}
 */
export function createDedupeKey(payload) {
  const str = `${payload?.summary}${payload?.service}${payload?.environment}${payload?.startsAt}`
  return crypto.createHash('md5').update(str).digest('hex')
}

/**
 * Decides if an alert should be sent based off the environment it originated in.
 * @param {Alert} alert
 * @param {string[]} environments
 * @returns {boolean}
 */
export function shouldSendAlert(alert, environments) {
  const overrides =
    serviceToPagerDutyServiceOverride[alert.service]?.environments

  const alertEnvironments = overrides || environments
  return alertEnvironments.includes(alert.environment)
}

/**
 * Gets the teams associated to an alert.
 * Uses overrides first if set, otherwise uses owners of service from portal-backend.
 * @param {Alert} alert
 * @returns {Promise<string[]>}
 */
export async function getTeams(alert) {
  const teams = serviceToPagerDutyServiceOverride[alert.service]?.teams

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

  return service.teams.map((team) => team.name)
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
  const overrides =
    serviceToPagerDutyServiceOverride[alert.service]?.technicalService

  const service = overrides || alert.service

  try {
    return config.get(`pagerduty.services.${service}.integrationKey`)
  } catch {
    return null
  }
}

/**
 *
 * @param {{MessageId: string, Body: string}} message
 * @returns {Promise<void>}
 */
export async function handleGrafanaPagerDutyAlert(message) {
  const payload = JSON.parse(message.Body)

  if (!shouldSendAlert(payload, config.get('alertEnvironments'))) {
    return
  }

  if (!payload?.service) {
    logger.warn(
      `alert did not contain a service field:\n${JSON.stringify(payload)}`
    )
    return
  }

  const teams = await getTeams(payload)

  const integrationKeys = teams
    .map((team) => findIntegrationKeyForTeam(team))
    .filter((t) => t)

  if (integrationKeys.length === 0) {
    const key = findIntegrationKeyForService(payload)
    if (key) {
      integrationKeys.push(key)
    }
  }

  if (integrationKeys.length === 0) {
    logger.info(
      `No integration key found for ${payload.service}. Not sending alert - MessageId: ${message.MessageId}`
    )
    return
  }

  logger.info(
    `Grafana alert ${payload.status} for ${payload.service} in ${payload.environment} - Alert: ${payload.alertName} MessageId: ${message.MessageId}`
  )

  if (config.get('pagerduty.sendAlerts')) {
    logger.info('Sending PagerDuty alert')

    let eventAction

    if (payload.status === 'firing') {
      eventAction = 'trigger'
    } else if (payload.status === 'resolved') {
      eventAction = 'resolve'
    } else {
      logger.warn(
        `Unexpected status ${payload.status} not sending alert:\n${JSON.stringify(payload)}`
      )
      return
    }

    const dedupeKey = createDedupeKey(payload)

    const alerts = integrationKeys.map(async (integrationKey) => {
      await sendAlert(integrationKey, payload, teams, dedupeKey, eventAction)
    })
    const result = await Promise.allSettled(alerts)
    result
      .filter((r) => r.status === 'rejected')
      .forEach((r) => {
        logger.error(`failed to send pager duty alert! ${r.reason}`)
      })
  } else {
    logger.warn('NOT Sending PagerDuty alert (sendAlerts disabled in config)')
  }
}

/**
 * @import { Logger } from 'pino'
 */
