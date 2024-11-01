import qs from 'qs'

import { config } from '~/src/config/index.js'

/**
 * @param {string} name
 */
async function fetchTeams(name) {
  const queryString = qs.stringify({ name }, { addQueryPrefix: true })

  const endpoint = config.get('userServiceBackendUrl') + `/teams${queryString}`

  const response = await fetch(endpoint, {
    method: 'get',
    headers: { 'Content-Type': 'application/json' }
  })
  return await response.json()
}

export { fetchTeams }
