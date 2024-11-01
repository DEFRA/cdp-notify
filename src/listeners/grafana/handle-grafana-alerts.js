import { config } from '~/src/config/index.js'
import { fetchTeams } from '~/src/helpers/fetch/fetch-teams.js'
import { deleteSqsMessage } from '~/src/helpers/sqs/delete-sqs-message.js'
import { sendEmail } from '~/src/helpers/ms-graph/send-email.js'
import { renderEmail } from '~/src/templates/emails/email-renderer.js'

const sendEmailAlerts = config.get('sendEmailAlerts')
const sender = config.get('senderEmailAddress')

function shouldSendAlert(payload) {
  return payload.team && payload.environment === 'prod'
}

async function handleGrafanaAlert(message, queueUrl, server) {
  const receiptHandle = message.ReceiptHandle
  const payload = JSON.parse(message.Body)

  if (shouldSendAlert(payload)) {
    const teamName = payload?.team
    const response = await fetchTeams(teamName)

    // todo what happens if teams not defined or length === 0
    if (!response.teams?.length) {
      server.logger.error(`Team ${teamName} not found in user-service-backend`)
      await deleteSqsMessage(server.sqs, queueUrl, receiptHandle)
      return
    }

    for (const team of response.teams) {
      if (!team.alertEmailAddresses) {
        server.logger.info(
          `Team ${teamName} did not have any alert email addresses configured. Not sending alert`
        )
        await deleteSqsMessage(server.sqs, queueUrl, receiptHandle)
        continue
      }

      if (sendEmailAlerts) {
        let email
        if (payload.status === 'firing') {
          email = renderEmail(payload)
        } else if (payload.status === 'resolved') {
          // todo this email needs to be constructed still
          email = generateResolvedEmail()
        } else {
          server.logger.warn(
            `Unexpected status ${payload.status} not sending alert`
          )
          await deleteSqsMessage(server.sqs, queueUrl, receiptHandle)
          continue
        }
        await sendEmail(server.msGraph, sender, email, team.alertEmailAddresses)
        await deleteSqsMessage(server.sqs, queueUrl, receiptHandle)
      } else {
        server.logger.info(`Alert for TBC`)
      }
    }
  }
}

// function generateFiringEmail(payload) {
//   return { subject: 'Firing', body: 'body' }
// }

function generateResolvedEmail() {
  return { subject: 'Resolved', body: 'body' }
}

export { handleGrafanaAlert }
