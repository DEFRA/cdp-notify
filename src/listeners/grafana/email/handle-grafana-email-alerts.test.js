import { createLogger } from '~/src/helpers/logging/logger.js'
import { handleGrafanaEmailAlert } from '~/src/listeners/grafana/email/handle-grafana-email-alerts.js'
import { sendEmail } from '~/src/helpers/ms-graph/send-email.js'
import { fetchTeam } from '~/src/helpers/fetch/fetch-team.js'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'
import { config } from '~/src/config/index.js'

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
    await handleGrafanaEmailAlert(message, server)

    expect(sendEmail).not.toHaveBeenCalled()
  })

  test('does not send email for non-prod alerts', async () => {
    const message = {
      Body: JSON.stringify({
        environment: 'dev',
        service: 'test-service'
      })
    }
    await handleGrafanaEmailAlert(message, server.logger, server.msGraph)

    expect(sendEmail).not.toHaveBeenCalled()
  })

  test('sends an emails to the service alert email address', async () => {
    jest
      .mocked(fetchService)
      .mockResolvedValue({ teams: [{ teamId: '123456' }] })
    jest.mocked(fetchTeam).mockResolvedValue({
      status: 'success',
      team: { name: 'test-team', alertEmailAddresses: ['foo@bar.com'] }
    })

    await handleGrafanaEmailAlert(alert, server.logger, server.msGraph)

    const sender = config.get('senderEmailAddress')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      {},
      sender,
      {
        body: expect.stringContaining('Grafana Firing Alert'),
        subject: 'Alert Triggered test-service - prod'
      },
      ['foo@bar.com']
    )
  })

  test('sends multiple emails if the service has multiple email addresses', async () => {
    jest
      .mocked(fetchService)
      .mockResolvedValue({ teams: [{ teamId: '123456' }] })
    jest.mocked(fetchTeam).mockResolvedValue({
      status: 'success',
      team: {
        name: 'test-team',
        alertEmailAddresses: ['a@foo.bar', 'b@foo.bar', 'c@foo.bar']
      }
    })

    await handleGrafanaEmailAlert(alert, server.logger, server.msGraph)

    const sender = config.get('senderEmailAddress')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      {},
      sender,
      {
        body: expect.stringContaining('Grafana Firing Alert'),
        subject: 'Alert Triggered test-service - prod'
      },
      ['a@foo.bar', 'b@foo.bar', 'c@foo.bar']
    )
  })

  test('sends multiple emails when the service is owned by more than one team', async () => {
    jest.mocked(fetchService).mockResolvedValue({
      teams: [{ teamId: '1111' }, { teamId: '2222' }]
    })

    jest
      .mocked(fetchTeam)
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

    await handleGrafanaEmailAlert(alert, server.logger, server.msGraph)

    const sender = config.get('senderEmailAddress')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      {},
      sender,
      {
        body: expect.stringContaining('Grafana Firing Alert'),
        subject: 'Alert Triggered test-service - prod'
      },
      ['user@team1', 'user@team2']
    )
  })

  test('sends multiple emails to unique email addresses when the service is owned by more than one team', async () => {
    jest.mocked(fetchService).mockResolvedValue({
      teams: [{ teamId: '1111' }, { teamId: '2222' }]
    })

    jest
      .mocked(fetchTeam)
      .mockResolvedValueOnce({
        status: 'success',
        team: {
          name: 'test-team-one',
          alertEmailAddresses: ['user@team1', 'user@duplicateTeam']
        }
      })
      .mockResolvedValueOnce({
        status: 'success',
        team: {
          name: 'test-team-two',
          alertEmailAddresses: ['user@team2', 'user@duplicateTeam']
        }
      })

    await handleGrafanaEmailAlert(alert, server.logger, server.msGraph)

    const sender = config.get('senderEmailAddress')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      {},
      sender,
      {
        body: expect.stringContaining('Grafana Firing Alert'),
        subject: 'Alert Triggered test-service - prod'
      },
      ['user@team1', 'user@duplicateTeam', 'user@team2']
    )
  })

  test('Firing email should contain expected content', async () => {
    jest
      .mocked(fetchService)
      .mockResolvedValue({ teams: [{ teamId: '123456' }] })
    jest.mocked(fetchTeam).mockResolvedValue({
      status: 'success',
      team: { name: 'test-team', alertEmailAddresses: ['foo@bar.com'] }
    })

    await handleGrafanaEmailAlert(alert, server.logger, server.msGraph)

    expect(sendEmail).toHaveBeenCalledTimes(1)

    const sendEmailMockThirdArg = sendEmail.mock.calls[0][2]
    expect(sendEmailMockThirdArg.body).toMatchSnapshot()
    expect(sendEmailMockThirdArg.subject).toBe(
      'Alert Triggered test-service - prod'
    )
  })

  test('Resolved email should contain expected content', async () => {
    jest
      .mocked(fetchService)
      .mockResolvedValue({ teams: [{ teamId: '123456' }] })
    jest.mocked(fetchTeam).mockResolvedValue({
      status: 'success',
      team: { name: 'test-team', alertEmailAddresses: ['foo@bar.com'] }
    })

    await handleGrafanaEmailAlert(
      { ...alert, status: 'resolved' },
      server.logger,
      server.msGraph
    )

    expect(sendEmail).toHaveBeenCalledTimes(1)

    const sendEmailMockThirdArg = sendEmail.mock.calls[0][2]
    expect(sendEmailMockThirdArg.body).toMatchSnapshot()
    expect(sendEmailMockThirdArg.subject).toBe(
      'Alert Resolved test-service - prod'
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
