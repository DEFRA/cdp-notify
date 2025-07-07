import {
  serviceToTeamOverride,
  platform
} from '~/src/config/service-override.js'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'

/**
 * @param {string} serviceName
 * @param {Logger} logger
 * @returns {Promise<{name: string, teamId: string}[]|*|*[]>}
 */
export async function getTeams(serviceName, logger) {
  const teams = serviceToTeamOverride[serviceName]?.teams

  if (teams) {
    return teams
  }

  const service = await fetchService(serviceName)
  if (service?.teams) {
    return service.teams
  }

  if (serviceName.startsWith('cdp-')) {
    return platform
  }

  logger.error(
    {
      event: {
        ...logger.bindings().event,
        outcome: 'No alert sent',
        reason: `service ${serviceName} was not found`
      }
    },
    `service ${serviceName} was not found`
  )

  return []
}
