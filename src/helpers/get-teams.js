import { serviceToTeamOverride } from '~/src/config/service-override.js'
import { fetchService } from '~/src/helpers/fetch/fetch-service.js'

/**
 * Gets the teams associated to an alert.
 * Uses overrides first if set, otherwise uses owners of service from portal-backend.
 * @param {string} serviceName
 * @param {Logger} logger
 * @returns {Promise<{name: string, teamId: string}[]>}
 */
export async function getTeams(serviceName, logger) {
  const teams = serviceToTeamOverride[serviceName]?.teams

  if (teams) {
    return Promise.resolve(teams)
  }

  const service = await fetchService(serviceName)
  if (!service?.teams) {
    logger.info(
      {
        event: {
          outcome: 'No alert sent',
          reason: `service ${serviceName} was not found`
        }
      },
      `service ${serviceName} was not found`
    )
    return []
  }

  return service.teams
}
