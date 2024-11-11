import { config } from '~/src/config/index.js'
import { sendEmail } from '~/src/helpers/ms-graph/send-email.js'
import { renderEmail } from '~/src/templates/emails/email-renderer.js'
import { fetchTeam } from '~/src/helpers/fetch/fetch-team.js'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

const sendEmailAlerts = config.get('sendEmailAlerts')
const sender = config.get('senderEmailAddress')

const logger = createLogger()

/**
 *
 * @param {Alert} alert
 * @returns {boolean}
 */
function shouldSendAlert(alert) {
  return alert.environment === 'prod'
}

/**
 * @param {Alert} alert
 * @returns {Promise<*[string]>}
 */
async function findContactsForAlert(alert) {
  if (!alert?.service) {
    logger.warn(`alert did not contain a service field`)
    return []
  }

  const service = await fetchService(alert.service)
  if (service === null) {
    logger.warn(`service ${alert.service} was not found`)
    return []
  }

  const contacts = []
  for (const t of service.teams) {
    const response = await fetchTeam(t.teamId)
    if (
      response?.team?.alertEmailAddresses &&
      Array.isArray(response?.team?.alertEmailAddresses)
    ) {
      contacts.push(...response?.team.alertEmailAddresses)
    }
  }

  logger.info(`found ${contacts.length} contacts for ${alert.service}`)
  return contacts
}

async function handleGrafanaAlert(message, server) {
  const payload = JSON.parse(message.Body)
  if (!shouldSendAlert(payload)) {
    return
  }

  let email
  if (payload.status === 'firing') {
    email = generateFiringEmail(payload)
  } else if (payload.status === 'resolved') {
    email = generateResolvedEmail(payload)
  } else {
    server.logger.warn(`Unexpected status ${payload.status} not sending alert`)
    return
  }

  const contacts = await findContactsForAlert(payload)
  if (contacts?.length === 0) {
    server.logger.info(
      `No contact details found ${payload.service}. Not sending alert`
    )
    return
  }

  if (sendEmailAlerts) {
    server.logger.info('Sending email alert')
    await sendEmail(server.msGraph, sender, email, contacts)
  } else {
    server.logger.debug(`Sending alert to ${contacts.join(',')}`)
    server.logger.info(`Alert for TBC`)
  }
}

/**
 *
 * @param {object} params
 * @returns {{subject: string, body: string}}
 */
function generateResolvedEmail(params) {
  const alertName = params?.alertName ?? ''
  return { subject: `Alert Resolved ${alertName}`, body: renderEmail(params) }
}

/**
 *
 * @param {object} params
 * @returns {{subject: string, body: string}}
 */
function generateFiringEmail(params) {
  const alertName = params?.alertName ?? ''
  return {
    subject: `Alert Triggered ${alertName}`,
    body: renderEmail(params)
  }
}

export { handleGrafanaAlert }

/**
 * @typedef Alert
 * @type {object}
 * @property {string} environment
 * @property {string} team
 * @property {string} service
 * @property {string} alertName
 * @property {string} status
 * @property {string} startsAt
 * @property {string} endsAt
 * @property {string} summary
 * @property {string} description
 * @property {string} series
 * @property {string} runbookUrl
 * @property {string} alertURL
 */
