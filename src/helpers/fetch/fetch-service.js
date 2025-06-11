import { config } from '~/src/config/index.js'

/**
 * Fetch Service info from portal backend.
 * @param {string} name
 * @returns {Promise<{teams: [{name: string, teamId: string}] }|null>}
 */
async function fetchService(name) {
  const endpoint = config.get('portalBackendUrl') + `/entities/${name}`
  const response = await fetch(endpoint, {
    method: 'get',
    headers: { 'Content-Type': 'application/json' }
  })
  if (response.status === 200) {
    return await response.json()
  } else {
    return null
  }
}

export { fetchService }
