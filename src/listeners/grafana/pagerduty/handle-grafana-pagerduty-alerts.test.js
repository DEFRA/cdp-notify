import {
  createDedupeKey,
  handleGrafanaPagerDutyAlert,
  shouldSendAlert
} from '~/src/listeners/grafana/pagerduty/handle-grafana-pagerduty-alerts.js'
import { serviceToTeamOverride } from '~/src/config/service-override.js'
import { config } from '~/src/config/index.js'
import { sendAlert } from '~/src/helpers/pagerduty/send-alert.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

describe('#createDedupeKey', () => {
  test('should create the same md5 string for identical payloads', () => {
    const msg1 = {
      environment: 'prod',
      team: 'Platform-test',
      service: 'cdp-canary-deployment-backend',
      alertName: 'cdp-canary-deployment-backend-ecs-running-tasks',
      status: 'resolved',
      startsAt: '2025-02-05 14:24:10 +0000 UTC',
      endsAt: '2025-02-05 14:24:10 +0000 UTC',
      summary: 'Number of ECS tasks running is below 1',
      description: '',
      series: 'RunningTaskCount',
      runbookUrl: '',
      alertURL:
        'https://metrics.prod.cdp-int.defra.cloud/alerting/grafana/eec2a2i238d8ge/view'
    }

    const msg2 = {
      environment: 'prod',
      team: 'Platform-test',
      service: 'cdp-canary-deployment-backend',
      alertName: 'cdp-canary-deployment-backend-ecs-running-tasks',
      status: 'firing',
      startsAt: '2025-02-05 14:18:40 +0000 UTC',
      endsAt: '0001-01-01 00:00:00 +0000 UTC',
      summary: 'Number of ECS tasks running is below 1',
      description: '',
      series: 'RunningTaskCount',
      runbookUrl: '',
      alertURL:
        'https://metrics.prod.cdp-int.defra.cloud/alerting/grafana/eec2a2i238d8ge/view'
    }
    expect(createDedupeKey(msg1)).toEqual(createDedupeKey(msg2))
  })

  test('should handle malformed payloads gracefully', () => {
    const malformed = {
      summary: 'test',
      service: 'foo',
      startsAt: '2025-02-03T11:14:25.507Z'
    }

    expect(createDedupeKey(malformed)).not.toBeNull()
    expect(createDedupeKey(null)).not.toBeNull()
  })
})

describe('#shouldSendAlert', () => {
  test('should only sends alerts for configured environments', () => {
    const alert = {
      environment: '',
      team: 'test',
      service: 'test-service',
      alertName: 'test-alert',
      status: 'critical',
      startsAt: '2025-02-03T11:14:25.507Z',
      endsAt: '2025-02-03T11:14:25.507Z',
      summary: 'an alert happened',
      description: 'it broke',
      series: '1',
      runbookUrl: '',
      alertURL: ''
    }
    const envsToAlert = ['prod', 'management']
    const envsToNotAlert = ['dev', 'test', 'infra-dev']

    for (const env of envsToAlert) {
      alert.environment = env
      expect(shouldSendAlert(alert, envsToAlert)).toBe(true)
    }
    expect.hasAssertions()

    for (const env of envsToNotAlert) {
      alert.environment = env
      expect(shouldSendAlert(alert, envsToAlert)).toBe(false)
    }
    expect.hasAssertions()
  })

  test('should override environments from config', () => {
    const alert = {
      environment: 'dev',
      team: 'test',
      service: 'foo',
      alertName: 'test-alert',
      status: 'critical',
      startsAt: '2025-02-03T11:14:25.507Z',
      endsAt: '2025-02-03T11:14:25.507Z',
      summary: 'an alert happened',
      description: 'it broke',
      series: '1',
      runbookUrl: '',
      alertURL: ''
    }

    const customEnvs = ['dev', 'test']
    serviceToTeamOverride.foo = { environments: customEnvs }

    const envsToAlert = ['prod', 'management']
    for (const env of envsToAlert) {
      alert.environment = env
      expect(shouldSendAlert(alert, envsToAlert)).toBe(false)
    }

    for (const env of customEnvs) {
      alert.environment = env
      expect(shouldSendAlert(alert, envsToAlert)).toBe(true)
    }
  })
})

jest.mock('~/src/helpers/pagerduty/send-alert.js')

describe('#sendAlertsToPagerduty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should trigger pagerduty message when grafana alert is fired', async () => {
    const integrationKey = '1234567890'
    const team = 'team1'
    const service1 = 'service1'

    jest.mocked(sendAlert).mockResolvedValue({ text: () => 'ok' })

    config.set(`pagerduty.teams.${team}.integrationKey`, integrationKey)
    config.set('pagerduty.sendAlerts', true)

    const grafanaAlert = {
      service: service1,
      environment: 'prod',
      status: 'firing',
      pagerDuty: 'true',
      teams: 'team1'
    }
    const logger = createLogger()
    await handleGrafanaPagerDutyAlert(grafanaAlert, logger)

    expect(sendAlert).toHaveBeenCalledWith(
      grafanaAlert,
      ['team1'],
      'trigger',
      undefined,
      expect.any(String),
      integrationKey,
      logger
    )
  })

  test('should not trigger pagerduty if alert has no pagerDuty=true flag', async () => {
    const integrationKey = '3453445'
    const team2 = 'team2'
    const service2 = 'service2'
    jest.mocked(sendAlert).mockResolvedValue({ text: () => 'ok' })

    config.set(`pagerduty.teams.${team2}.integrationKey`, integrationKey)
    config.set('pagerduty.sendAlerts', true)

    const grafanaAlert = {
      service: service2,
      environment: 'prod',
      status: 'firing',
      teams: 'team2'
    }

    await handleGrafanaPagerDutyAlert(grafanaAlert, createLogger())

    expect(sendAlert).not.toHaveBeenCalled()
  })

  test('should not trigger pagerduty no integration keys are set for team', async () => {
    const team3 = 'team3'
    const service3 = 'service3'
    jest.mocked(sendAlert).mockResolvedValue({ text: () => 'ok' })

    config.set('pagerduty.sendAlerts', true)

    const grafanaAlert = {
      service: service3,
      environment: 'prod',
      status: 'firing',
      pagerDuty: 'true',
      teams: team3
    }

    await handleGrafanaPagerDutyAlert(grafanaAlert, createLogger())

    expect(sendAlert).not.toHaveBeenCalled()
  })
})
