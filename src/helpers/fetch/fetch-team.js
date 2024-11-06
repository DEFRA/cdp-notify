import qs from 'qs'

import { config } from '~/src/config/index.js'

async function findTeams(name) {
  const queryString = qs.stringify({ name }, { addQueryPrefix: true })

  const endpoint = config.get('userServiceBackendUrl') + `/teams${queryString}`

  const response = await fetch(endpoint, {
    method: 'get',
    headers: { 'Content-Type': 'application/json' }
  })
  return await response.json()
}

/**
 *
 * @param {string} id
 * @returns {Promise<{message: string, team: {alertEmailAddresses: [string]}}>}
 */
async function fetchTeam(id) {
  const endpoint = config.get('userServiceBackendUrl') + `/teams/${id}`
  const response = await fetch(endpoint, {
    method: 'get',
    headers: { 'Content-Type': 'application/json' }
  })
  return await response.json()
}

export { fetchTeam, findTeams }
