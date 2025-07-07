import { createLogger } from '~/src/helpers/logging/logger.js'
import {
  serviceToTeamOverride,
  platform
} from '~/src/config/service-override.js'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'
import { getTeams } from '~/src/helpers/get-teams.js'

jest.mock('~/src/helpers/fetch/fetch-service.js')
jest.mock('~/src/helpers/pagerduty/send-alert.js')

describe('#getTeams', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('getTeams should use the overrides when configured', async () => {
    const res = await getTeams('cdp-lambda', createLogger())
    expect(res).toBe(serviceToTeamOverride['cdp-lambda'].teams)
  })

  test('getTeams should looks up the team in portal-backend', async () => {
    jest
      .mocked(fetchService)
      .mockResolvedValue({ teams: [{ name: 'Platform' }, { name: 'Support' }] })

    const res = await getTeams('test-service')
    expect(res).toEqual([{ name: 'Platform' }, { name: 'Support' }])
  })

  test('getTeams should returns an empty array when the service is not found', async () => {
    jest.mocked(fetchService).mockResolvedValue(null)

    const res = await getTeams('test-service', createLogger())
    expect(res).toEqual([])
  })

  test('getTeams should return platform team for a team that starts with cdp but is not in the override', async () => {
    jest.mocked(fetchService).mockResolvedValue(null)

    const res = await getTeams('cdp-made-up', createLogger())
    expect(res).toEqual(platform)
  })
})
