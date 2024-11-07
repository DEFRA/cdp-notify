import nunjucks from 'nunjucks'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const nunjucksEnvironment = nunjucks.configure(
  [path.resolve(__dirname), path.resolve(__dirname, 'html')],
  {
    trimBlocks: true,
    lstripBlocks: true,
    watch: false
  }
)

/**
 *
 * @param {any} params
 * @returns {string}
 */
function renderEmail(params) {
  return nunjucksEnvironment.renderString(
    `{%- from "macro.njk" import emailHtml -%}{{- emailHtml(${JSON.stringify(params, null, 2)}) -}}`,
    {}
  )
}

export { renderEmail }
