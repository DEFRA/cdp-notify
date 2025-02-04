import {
  createDedupeKey,
  findIntegrationKeyForService,
  getTeams,
  handleGrafanaPagerDutyAlert,
  shouldSendAlert
} from '~/src/listeners/grafana/pagerduty/handle-grafana-pagerduty-alerts.js'
import { serviceToPagerDutyServiceOverride } from '~/src/config/pagerduty-service-override.js'
import { pino } from 'pino'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'
import { logger } from '@azure/identity'
import { config } from '~/src/config/index.js'
import { sendAlert } from '~/src/helpers/pagerduty/send-alert.js'

describe('#createDedupeKey', () => {
  test('should create the same md5 string for identical payloads', () => {
    const payload = {
      summary: 'test',
      service: 'foo',
      environment: 'dev',
      startsAt: '2025-02-03T11:14:25.507Z'
    }
    expect(createDedupeKey(payload)).toEqual(createDedupeKey(payload))
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

    for (const env of envsToNotAlert) {
      alert.environment = env
      expect(shouldSendAlert(alert, envsToAlert)).toBe(false)
    }
  })

  test('should override environments from config', () => {
    const alert = {
      environment: 'dev',
      team: 'test',
      service: 'foo'
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
    const logger = pino({})
    const res = await getTeams({ service: 'cdp-lambda' }, logger)
    expect(res).toBe(serviceToPagerDutyServiceOverride['cdp-lambda'].teams)
  })

  test('getTeams should looks up the team in portal-backend', async () => {
    jest
      .mocked(fetchService)
      .mockResolvedValue({ teams: [{ name: 'Platform' }, { name: 'Support' }] })

    const res = await getTeams({ service: 'test-service' }, logger)
    expect(res).toEqual(['Platform', 'Support'])
  })

  test('getTeams should returns an empty array when the service is not found', async () => {
    jest.mocked(fetchService).mockResolvedValue(null)

    const res = await getTeams({ service: 'test-service' }, logger)
    expect(res).toEqual([])
  })

  test('should trigger pagerduty message when grafana alert is fired', async () => {
    const integrationKey = '1234567890'
    const team = 'team1'
    const service = 'service1'
    jest.mocked(fetchService).mockResolvedValue({ teams: [{ name: team }] })
    jest.mocked(sendAlert).mockResolvedValue(null)

    config.set(`pagerduty.teams.${team}.integrationKey`, integrationKey)
    config.set('pagerduty.sendAlerts', true)

    const server = { logger: pino({}) }
    const payload = {
      service,
      environment: 'prod',
      status: 'firing'
    }
    const message = {
      Body: JSON.stringify(payload)
    }
    await handleGrafanaPagerDutyAlert(message, server)

    expect(fetchService).toHaveBeenCalledWith(service)
    expect(sendAlert).toHaveBeenCalledWith(
      integrationKey,
      payload,
      [team],
      expect.any(String),
      'trigger'
    )
  })
})
