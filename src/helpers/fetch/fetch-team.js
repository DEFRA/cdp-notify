import { config } from '~/src/config/index.js'

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

export { fetchTeam }
