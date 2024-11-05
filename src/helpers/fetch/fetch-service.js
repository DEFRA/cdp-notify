import { config } from '~/src/config/index.js'

/**
 * @param {string} name
 * @returns {Promise<{teams: [{teamId: string}] }|null>}
 */
async function fetchService(name) {
  const endpoint = config.get('portalBackendUrl') + `/services/${name}`
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
