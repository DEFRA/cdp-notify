import { config } from '~/src/config/index.js'
import { serviceToTeamOverride } from '~/src/config/service-override.js'
import { sendAlert } from '~/src/helpers/pagerduty/send-alert.js'

import crypto from 'crypto'
import { getTeams } from '~/src/helpers/get-teams.js'

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
 * Creates an event-scoped logger function.
 * @param {Logger} logger
 * @returns {(outcome: string, reason?: string) => Logger}
 */
function eventLogger(logger) {
  return (outcome, reason) =>
    logger.child({
      event: {
        ...logger.bindings().event,
        outcome,
        ...(reason && { reason })
      }
    })
}

/**
 *
 * @param {object} alert
 * @param {Logger} logger
 * @returns {Promise<void>}
 */
export async function handleGrafanaPagerDutyAlert(alert, logger) {
  const noAlertLogger = (reason) => eventLogger(logger)('No alert sent', reason)

  // reject alerts that are not flagged for pagerDuty
  if (alert?.pagerDuty !== 'true') {
    noAlertLogger('does not have a pagerDuty=true').info(`ignoring alert`)
    return
  }

  if (!alert?.service) {
    noAlertLogger('alert did not contain a service field').warn(
      `no service field`
    )
    return
  }

  if (!shouldSendAlert(alert, config.get('alertEnvironments'))) {
    noAlertLogger('environment not configured for alerts').info(
      `ignoring alert`
    )
    return
  }

  const teams = getTeams(alert, logger)

  const integrationKeys = teams
    .map((team) => findIntegrationKeyForTeam(team))
    .filter((t) => t)

  if (integrationKeys.length === 0) {
    noAlertLogger(`No integration key found for ${alert.service}.`).info(
      `No integration key`
    )
    return
  }

  let eventAction
  let timestamp

  if (alert.status === 'firing') {
    eventAction = 'trigger'
    if (alert.startsAt) {
      timestamp = new Date(alert?.startsAt.split(' m=')[0]).toISOString()
    }
  } else if (alert.status === 'resolved') {
    eventAction = 'resolve'
    if (alert.endsAt) {
      timestamp = new Date(alert.endsAt.split(' m=')[0]).toISOString()
    }
  } else {
    noAlertLogger(`Unexpected status ${alert.status}`).warn(`Unexpected status`)
    return
  }

  const dedupeKey = createDedupeKey(alert)

  if (config.get('pagerduty.sendAlerts')) {
    const pagerDutyResponses = integrationKeys.map(async (integrationKey) => {
      const resp = await sendAlert(
        alert,
        teams,
        eventAction,
        timestamp,
        dedupeKey,
        integrationKey,
        logger
      )
      const respText = await resp.text()

      eventLogger(logger)('alert sent', respText).info(
        `Alert sent with dedupe ${dedupeKey}`
      )
    })
    await Promise.allSettled(pagerDutyResponses)
  } else {
    noAlertLogger('sendAlerts disabled in config').warn('Alert not sent')
  }
}

/**
 * @typedef {import("pino").Logger} Logger
 */
