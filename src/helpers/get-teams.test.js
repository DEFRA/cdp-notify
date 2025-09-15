import { createLogger } from '~/src/helpers/logging/logger.js'
import {
  serviceToTeamOverride,
  platform
} from '~/src/config/service-override.js'
import { getTeams } from '~/src/helpers/get-teams.js'

describe('#getTeams', () => {
  test('getTeams should get the teams from the teams on the alert', () => {
    const res = getTeams({ service: 'test-service', teams: 'platform,support' })
    expect(res).toEqual(['platform', 'support'])
  })

  test('getTeams should use the overrides when configured', () => {
    const res = getTeams({ service: 'cdp-lambda' }, createLogger())
    expect(res).toBe(serviceToTeamOverride['cdp-lambda'].teams)
  })

  test('getTeams should returns an empty array when the service is not found', () => {
    const res = getTeams({ service: 'test-service' }, createLogger())
    expect(res).toEqual([])
  })

  test('getTeams should return platform team for a team that starts with cdp but is not in the override', () => {
    const res = getTeams({ service: 'cdp-made-up' }, createLogger())
    expect(res).toEqual(platform.teams)
  })

  test('getTeams should return lower cased value from team if teams is missing', () => {
    const res = getTeams(
      { service: 'made-up', team: 'Made-Up-Team' },
      createLogger()
    )
    expect(res).toEqual(['made-up-team'])
  })
})
