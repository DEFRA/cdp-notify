import { createLogger } from '~/src/helpers/logging/logger.js'
import { handleGrafanaAlert } from '~/src/listeners/grafana/handle-grafana-alerts.js'
import { sendEmail } from '~/src/helpers/ms-graph/send-email.js'
import { fetchTeam } from '~/src/helpers/fetch/fetch-team.js'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'
import { renderEmail } from '~/src/templates/emails/email-renderer.js'
import { config } from '~/src/config/index.js'

jest.mock('~/src/templates/emails/email-renderer.js')
jest.mock('~/src/helpers/ms-graph/send-email.js')
jest.mock('~/src/helpers/fetch/fetch-team.js')
jest.mock('~/src/helpers/fetch/fetch-service.js')

describe('#handle-grafana-alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const server = { logger: createLogger(), msGraph: {} }

  test('does not send email for an invalid message', async () => {
    const message = { Body: '{"status": "ok"}' }
    await handleGrafanaAlert(message, server)

    expect(sendEmail).not.toHaveBeenCalled()
  })

  test('does not send email for non-prod alerts', async () => {
    const message = {
      Body: JSON.stringify({
        environment: 'dev',
        service: 'test-service'
      })
    }
    await handleGrafanaAlert(message, server)

    expect(sendEmail).not.toHaveBeenCalled()
  })

  test('sends an emails to the service owners contact addresses', async () => {
    renderEmail.mockReturnValue('email')
    fetchService.mockResolvedValue({ teams: [{ teamId: '123456' }] })
    fetchTeam.mockResolvedValue({
      status: 'success',
      team: { name: 'test-team', alertEmailAddresses: ['foo@bar.com'] }
    })

    const message = {
      Body: JSON.stringify(alert)
    }
    await handleGrafanaAlert(message, server)

    const sender = config.get('senderEmailAddress')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      {},
      sender,
      {
        body: 'email',
        subject: 'Alert Triggered test-service - prod'
      },
      ['foo@bar.com']
    )
  })

  test('sends an multiple emails if the service has more than one', async () => {
    renderEmail.mockReturnValue('email')
    fetchService.mockResolvedValue({ teams: [{ teamId: '123456' }] })
    fetchTeam.mockResolvedValue({
      status: 'success',
      team: {
        name: 'test-team',
        alertEmailAddresses: ['a@foo.bar', 'b@foo.bar', 'c@foo.bar']
      }
    })

    const message = {
      Body: JSON.stringify(alert)
    }
    await handleGrafanaAlert(message, server)

    const sender = config.get('senderEmailAddress')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      {},
      sender,
      {
        body: 'email',
        subject: 'Alert Triggered test-service - prod'
      },
      ['a@foo.bar', 'b@foo.bar', 'c@foo.bar']
    )
  })

  test('sends an multiple emails the service is owned by more than one team', async () => {
    renderEmail.mockReturnValue('email')
    fetchService.mockResolvedValue({
      teams: [{ teamId: '1111' }, { teamId: '2222' }]
    })

    fetchTeam
      .mockResolvedValueOnce({
        status: 'success',
        team: {
          name: 'test-team-one',
          alertEmailAddresses: ['user@team1']
        }
      })
      .mockResolvedValueOnce({
        status: 'success',
        team: {
          name: 'test-team-two',
          alertEmailAddresses: ['user@team2']
        }
      })

    const message = {
      Body: JSON.stringify(alert)
    }
    await handleGrafanaAlert(message, server)

    const sender = config.get('senderEmailAddress')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      {},
      sender,
      {
        body: 'email',
        subject: 'Alert Triggered test-service - prod'
      },
      ['user@team1', 'user@team2']
    )
  })
})

const alert = {
  environment: 'prod',
  service: 'test-service',
  team: 'Platform',
  alertName: 'test-service - prod',
  status: 'firing',
  startsAt: '2024-11-04 12:53:20 +0000 UTC',
  endsAt: '2024-11-04 12:53:20 +0000 UTC',
  summary: 'A test suite',
  description: '',
  series: '',
  runbookUrl: '',
  alertURL: 'https://grafana/alerting/grafana/0000/view'
}
