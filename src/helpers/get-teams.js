import {
  platform,
  serviceToTeamOverride
} from '~/src/config/service-override.js'

/**
 * @param {object} alert
 * @param {Logger} logger
 * @returns {string[]}
 */
export function getTeams(alert, logger) {
  if (alert.teams) {
    return alert.teams.split(',')
  }

  const serviceName = alert.service
  const teams = serviceToTeamOverride[serviceName]?.teams

  if (teams) {
    return teams
  }

  if (serviceName.startsWith('cdp-')) {
    return platform.teams
  }

  if (alert.team) {
    logger.warn(
      {
        event: logger.bindings().event
      },
      `teams was missing from alert`
    )
    return [alert.team.toLowerCase()]
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
