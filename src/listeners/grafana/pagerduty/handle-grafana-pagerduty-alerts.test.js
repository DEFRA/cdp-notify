import {
  createDedupeKey,
  findIntegrationKeyForService,
  getTeams,
  handleGrafanaPagerDutyAlert,
  shouldSendAlert
} from '~/src/listeners/grafana/pagerduty/handle-grafana-pagerduty-alerts.js'
import { serviceToPagerDutyServiceOverride } from '~/src/config/pagerduty-service-override.js'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'
import { config } from '~/src/config/index.js'
import { sendAlert } from '~/src/helpers/pagerduty/send-alert.js'

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
    serviceToPagerDutyServiceOverride.foo = { environments: customEnvs }

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

describe('findIntegrationKeyForService', () => {
  test('should return null if key is not in config', () => {
    const res = findIntegrationKeyForService({
      service: 'this-is-not-a-real-service'
    })

    expect(res).toBeNull()
  })

  test('should return the key if set in config', () => {
    const service = 'find-integration-1'
    const key = '1234'
    config.set(`pagerduty.services.${service}.integrationKey`, key)

    const res = findIntegrationKeyForService({
      service
    })

    expect(res).toBe(key)
  })

  test('should return the key if set in overrides', () => {
    const service = 'find-integration-2'
    const technicalService = 'technical-service-2'
    const key = '9999'
    serviceToPagerDutyServiceOverride[service] = { technicalService }
    config.set(`pagerduty.services.${technicalService}.integrationKey`, key)

    const res = findIntegrationKeyForService({
      service
    })

    expect(res).toBe(key)
  })
})

jest.mock('~/src/helpers/fetch/fetch-service.js')
jest.mock('~/src/helpers/pagerduty/send-alert.js')

describe('#sendAlertsToPagerduty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('getTeams should use the overrides when configured', async () => {
    const res = await getTeams({ service: 'cdp-lambda' })
    expect(res).toBe(serviceToPagerDutyServiceOverride['cdp-lambda'].teams)
  })

  test('getTeams should looks up the team in portal-backend', async () => {
    jest
      .mocked(fetchService)
      .mockResolvedValue({ teams: [{ name: 'Platform' }, { name: 'Support' }] })

    const res = await getTeams({ service: 'test-service' })
    expect(res).toEqual(['platform', 'support'])
  })

  test('getTeams should returns an empty array when the service is not found', async () => {
    jest.mocked(fetchService).mockResolvedValue(null)

    const res = await getTeams({ service: 'test-service' })
    expect(res).toEqual([])
  })

  test('should trigger pagerduty message when grafana alert is fired', async () => {
    const integrationKey = '1234567890'
    const team = 'team1'
    const service1 = 'service1'
    jest.mocked(fetchService).mockResolvedValue({ teams: [{ name: team }] })
    jest.mocked(sendAlert).mockResolvedValue({ text: () => 'ok' })

    config.set(`pagerduty.teams.${team}.integrationKey`, integrationKey)
    config.set('pagerduty.sendAlerts', true)

    const grafanaAlert = {
      service: service1,
      environment: 'prod',
      status: 'firing',
      pagerDuty: 'true'
    }
    const message = {
      MessageId: '123',
      Body: JSON.stringify(grafanaAlert)
    }
    await handleGrafanaPagerDutyAlert(message)

    expect(fetchService).toHaveBeenCalledWith(service1)
    expect(sendAlert).toHaveBeenCalledWith(
      integrationKey,
      grafanaAlert,
      [team],
      expect.any(String),
      'trigger'
    )
  })

  test('should not trigger pagerduty if alert has no pagerDuty=true flag', async () => {
    const integrationKey = '3453445'
    const team2 = 'team2'
    const service2 = 'service2'
    jest.mocked(fetchService).mockResolvedValue({ teams: [{ name: team2 }] })
    jest.mocked(sendAlert).mockResolvedValue({ text: () => 'ok' })

    config.set(`pagerduty.teams.${team2}.integrationKey`, integrationKey)
    config.set('pagerduty.sendAlerts', true)

    const grafanaAlert = {
      service: service2,
      environment: 'prod',
      status: 'firing'
    }
    const message = {
      MessageId: '123',
      Body: JSON.stringify(grafanaAlert)
    }
    await handleGrafanaPagerDutyAlert(message)

    expect(fetchService).not.toHaveBeenCalled()
    expect(sendAlert).not.toHaveBeenCalled()
  })

  test('should not trigger pagerduty no integration keys are set for team', async () => {
    const team3 = 'team3'
    const service3 = 'service3'
    jest.mocked(fetchService).mockResolvedValue({ teams: [{ name: team3 }] })
    jest.mocked(sendAlert).mockResolvedValue({ text: () => 'ok' })

    config.set('pagerduty.sendAlerts', true)

    const grafanaAlert = {
      service: service3,
      environment: 'prod',
      status: 'firing',
      pagerDuty: 'true'
    }
    const message = {
      MessageId: '123',
      Body: JSON.stringify(grafanaAlert)
    }
    await handleGrafanaPagerDutyAlert(message)

    expect(fetchService).toHaveBeenCalledWith(service3)
    expect(sendAlert).not.toHaveBeenCalled()
  })

  test('should trigger pagerduty using the fallback service key', async () => {
    const integrationKey = 'service-level-key'
    const team4 = 'team4'
    const service4 = 'service4'
    jest.mocked(fetchService).mockResolvedValue({ teams: [{ name: team4 }] })
    jest.mocked(sendAlert).mockResolvedValue({ text: () => 'ok' })

    config.set('pagerduty.sendAlerts', true)
    config.set(`pagerduty.services.${service4}.integrationKey`, integrationKey)

    const grafanaAlert = {
      service: service4,
      environment: 'prod',
      status: 'firing',
      pagerDuty: 'true'
    }
    const message = {
      MessageId: '123',
      Body: JSON.stringify(grafanaAlert)
    }
    await handleGrafanaPagerDutyAlert(message)

    expect(fetchService).toHaveBeenCalledWith(service4)
    expect(sendAlert).toHaveBeenCalledWith(
      integrationKey,
      grafanaAlert,
      [team4],
      expect.any(String),
      'trigger'
    )
  })
})
