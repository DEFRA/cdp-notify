import nunjucks from 'nunjucks'
import path from 'path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const nunjucksTestEnv = nunjucks.configure([path.resolve(dirname)], {
  trimBlocks: true,
  lstripBlocks: true,
  watch: false
})

function renderEmail(params) {
  return nunjucksTestEnv.renderString(
    `{%- from "macro.njk" import emailHtml -%}{{- emailHtml(${JSON.stringify(params, null, 2)}) -}}`,
    {}
  )
}

export { renderEmail }
