import { config } from '~/src/config/index.js'
import { sendEmail } from '~/src/helpers/ms-graph/send-email.js'
import { fetchTeam } from '~/src/helpers/fetch/fetch-team.js'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'
import { renderEmail } from '~/src/helpers/nunjucks/render-email.js'
import { serviceToTeamOverride } from '~/src/config/service-override.js'

const sendEmailAlerts = config.get('sendEmailAlerts')
const sender = config.get('senderEmailAddress')

const renderGrafanaEmail = renderEmail('grafana-alert')
const alertColours = {
  success: '#00703c',
  failure: '#d4351C'
}

/**
 *
 * @param {Alert} alert
 * @returns {boolean}
 */
function shouldSendAlert(alert) {
  const alertEnvironments = config.get('alertEnvironments')
  return alertEnvironments.includes(alert.environment)
}

async function getTeams(serviceName, logger) {
  const override = serviceToTeamOverride[serviceName]?.teams

  if (override) {
    return override
  }

  const service = await fetchService(serviceName)
  if (!service?.teams) {
    logger.info(`service ${serviceName} was not found`)
    return []
  }

  const teams = service.teams.map(async (team) => await fetchTeam(team.teamId))

  return await Promise.all(teams)
}

/**
 * @param {Alert} alert
 * @param {Logger} logger
 * @returns {Promise<*[string]>}
 */
async function findContactsForAlert(alert, logger) {
  const teams = await getTeams(alert.service, logger)

  const contacts = teams.map((team) =>
    team.team?.alertEmailAddresses?.length ? team.team.alertEmailAddresses : []
  )
  const uniqueContacts = [...new Set(contacts.flat())]

  logger.info(
    `found ${uniqueContacts.length} alert email addresses for ${alert.service}`
  )
  return uniqueContacts
}

async function handleGrafanaEmailAlert(message, logger, msGraph) {
  const payload = JSON.parse(message.Body)

  if (!shouldSendAlert(payload)) {
    return
  }

  if (!payload?.service) {
    logger.warn(`alert did not contain a service field`)
    return []
  }

  let email
  if (payload.status === 'firing') {
    email = generateFiringEmail(payload)
  } else if (payload.status === 'resolved') {
    email = generateResolvedEmail(payload)
  } else {
    logger.warn(`Unexpected status ${payload.status} not sending alert`)
    return
  }

  const contacts = await findContactsForAlert(payload, logger)
  if (!contacts?.length) {
    logger.info(
      `No contact details found ${payload.service}. Not sending alert`
    )
    return
  }

  logger.debug(`Sending alert to ${contacts.join(',')}`)
  logger.info(
    `Grafana alert ${payload.status} for ${payload.service} in ${payload.environment} - Alert: ${payload.alertName}`
  )

  if (sendEmailAlerts) {
    logger.info('Sending email alert')
    await sendEmail(msGraph, sender, email, contacts)
  }
}

/**
 * Generate an email for a firing alert
 * @param {Alert} params
 * @returns {EmailContent}
 */
function generateFiringEmail(params) {
  const subject =
    'Alert Triggered' + (params.alertName ? ` ${params.alertName}` : '')
  const context = {
    pageTitle: 'Grafana Firing Alert',
    statusColour: alertColours.failure,
    ...params
  }

  return {
    subject,
    body: renderGrafanaEmail(context)
  }
}

/**
 * Generate an email for a resolved alert
 * @param {Alert} params
 * @returns {EmailContent}
 */
function generateResolvedEmail(params) {
  const subject =
    'Alert Resolved' + (params.alertName ? ` ${params.alertName}` : '')

  const context = {
    pageTitle: 'Grafana Alert Resolved',
    statusColour: alertColours.success,
    ...params
  }

  return {
    subject,
    body: renderGrafanaEmail(context)
  }
}

export { handleGrafanaEmailAlert }

/**
 * @typedef {object} Alert
 * @property {string} environment
 * @property {string} team
 * @property {string} service
 * @property {string} alertName
 * @property {string} pagerDuty
 * @property {string} status
 * @property {string} startsAt
 * @property {string} endsAt
 * @property {string} summary
 * @property {string} description
 * @property {string} series
 * @property {string} runbookUrl
 * @property {string} alertURL
 */

/**
 * @typedef {object} EmailContent
 * @property {string} subject
 * @property {string} body
 */

/**
 * @import {Logger} from 'pino'
 */
