import { nunjucksEnvironment } from '~/src/config/nunjucks/environment.js'

function renderEmail(name) {
  return (context) => {
    const viewPath = `emails/${name}.njk`

    return nunjucksEnvironment.render(viewPath, context)
  }
}

export { renderEmail }
