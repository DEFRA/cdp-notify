import { config } from '~/src/config/index.js'
import { sendEmail } from '~/src/helpers/ms-graph/send-email.js'
import { renderEmail } from '~/src/templates/emails/email-renderer.js'
import { fetchTeam } from '~/src/helpers/fetch/fetch-team.js'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'

const sendEmailAlerts = config.get('sendEmailAlerts')
const sender = config.get('senderEmailAddress')

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
 * @param {import('pino').Logger} logger
 * @returns {Promise<*[string]>}
 */
async function findContactsForAlert(alert, logger) {
  if (!alert?.service) {
    logger.warn(
      `alert did not contain a service field:\n${JSON.stringify(alert)}`
    )
    return []
  }

  const service = await fetchService(alert.service)
  if (!service?.teams) {
    logger.warn(
      `service ${alert.service} was not found:\n${JSON.stringify(alert)}`
    )
    return []
  }

  const contactsPromises = service.teams.map(async (team) => {
    const response = await fetchTeam(team.teamId)
    return response?.team?.alertEmailAddresses?.length
      ? response?.team.alertEmailAddresses
      : []
  })

  const contacts = await Promise.all(contactsPromises)
  const uniqueContacts = [...new Set(contacts.flat())]

  logger.info(
    `found ${uniqueContacts.length} alert email addresses for ${alert.service}`
  )
  return uniqueContacts
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
    server.logger.warn(
      `Unexpected status ${payload.status} not sending alert:\n${JSON.stringify(payload)}`
    )
    return
  }

  const contacts = await findContactsForAlert(payload, server.logger)
  if (!contacts?.length) {
    server.logger.info(
      `No contact details found ${payload.service}. Not sending alert - MessageId: ${message.MessageId}`
    )
    return
  }

  server.logger.debug(`Sending alert to ${contacts.join(',')}`)
  server.logger.info(
    `Grafana alert ${payload.status} for ${payload.service} in ${payload.environment} - Alert: ${payload.alertName} MessageId: ${message.MessageId}`
  )

  if (sendEmailAlerts) {
    server.logger.info('Sending email alert')
    await sendEmail(server.msGraph, sender, email, contacts)
  }
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
    body: renderEmail(params, '#d4351C')
  }
}

/**
 *
 * @param {object} params
 * @returns {{subject: string, body: string}}
 */
function generateResolvedEmail(params) {
  const alertName = params?.alertName ?? ''
  return {
    subject: `Alert Resolved ${alertName}`,
    body: renderEmail(params, '#00703c')
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
