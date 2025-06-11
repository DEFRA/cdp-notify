import { config } from '~/src/config/index.js'
import { sendEmail } from '~/src/helpers/ms-graph/send-email.js'
import { renderEmail } from '~/src/helpers/nunjucks/render-email.js'
import { getTeams } from '~/src/helpers/get-teams.js'
import { fetchTeam } from '~/src/helpers/fetch/fetch-team.js'

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

/**
 * @param {Alert} alert
 * @param {Logger} logger
 * @returns {Promise<*[string]>}
 */
async function findContactsForAlert(alert, logger) {
  const serviceTeams = await getTeams(alert.service, logger)

  const teams = serviceTeams.map(async (team) => await fetchTeam(team.teamId))

  const contacts = (await Promise.all(teams))
    .map((t) => t.team?.alertEmailAddresses || [])
    .flat() // flatten nested arrays into one

  const uniqueContacts = [...new Set(contacts)]

  logger.info(
    `found ${uniqueContacts.length} alert email addresses for ${alert.service}`
  )
  return uniqueContacts
}

async function handleGrafanaEmailAlert(alert, logger, msGraph) {
  if (!shouldSendAlert(alert)) {
    return
  }

  if (!alert?.service) {
    logger.warn(`alert did not contain a service field`)
    return []
  }

  let email
  if (alert.status === 'firing') {
    email = generateFiringEmail(alert)
  } else if (alert.status === 'resolved') {
    email = generateResolvedEmail(alert)
  } else {
    logger.warn(`Unexpected status ${alert.status} not sending alert`)
    return
  }

  const contacts = await findContactsForAlert(alert, logger)
  if (!contacts?.length) {
    logger.info(`No contact details found ${alert.service}. Not sending alert`)
    return
  }

  logger.debug(`Sending alert to ${contacts.join(',')}`)
  logger.info(
    `Grafana alert ${alert.status} for ${alert.service} in ${alert.environment} - Alert: ${alert.alertName}`
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
