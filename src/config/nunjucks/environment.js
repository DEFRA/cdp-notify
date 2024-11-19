import path from 'node:path'
import { fileURLToPath } from 'node:url'

import nunjucks from 'nunjucks'

import { config } from '~/src/config/index.js'
import * as filters from '~/src/config/nunjucks/filters.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const paths = {
  templates: path.normalize(path.resolve(dirname, '..', '..', 'templates'))
}

const nunjucksEnvironment = nunjucks.configure([paths.templates], {
  autoescape: true,
  throwOnUndefined: false,
  trimBlocks: true,
  lstripBlocks: true,
  watch: config.get('nunjucks.watch'),
  noCache: config.get('nunjucks.noCache')
})

Object.keys(filters).forEach((filter) => {
  nunjucksEnvironment.addFilter(filter, filters[filter])
})

export { nunjucksEnvironment }
