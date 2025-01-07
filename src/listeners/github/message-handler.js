import { config } from '~/src/config/index.js'
import { workflowRunNotificationHandler } from '~/src/listeners/github/workflow-run-notification-handler.js'

const gitHubRepoConfig = config.get('github.repos')
const gitHubWorkflowConfig = config.get('github.failedWorkflows')

const githubWebhooks = new Set([
  gitHubRepoConfig.appDeployments,
  gitHubRepoConfig.cdpTfSvcInfra,
  gitHubRepoConfig.cdpAppConfig,
  gitHubRepoConfig.cdpNginxUpstreams,
  gitHubRepoConfig.createWorkflows,
  gitHubRepoConfig.cdpSquidProxy,
  gitHubRepoConfig.cdpGrafanaSvc
])

const shouldProcessCreateWorkflows = (message) => {
  if (message?.github_event === 'workflow_run') {
    const repoName = message.repository?.name
    const workflowName = message.workflow_run?.name
    const infraDevTfSvcInfraRun =
      repoName === gitHubRepoConfig.cdpTfSvcInfra &&
      workflowName.toLocaleLowerCase().includes('infra-dev')

    return githubWebhooks.has(repoName) && !infraDevTfSvcInfraRun
  }
  return false
}

const shouldProcessPortalJourneyTests = (message) => {
  return (
    message?.github_event === 'workflow_run' &&
    message?.workflow_run?.name === gitHubWorkflowConfig.portalJourney.name
  )
}

const handle = async (server, message) => {
  if (shouldProcessCreateWorkflows(message)) {
    const slackChannel = gitHubWorkflowConfig.createService.slackChannel
    await workflowRunNotificationHandler(server, message, slackChannel)
  }

  if (shouldProcessPortalJourneyTests(message)) {
    const slackChannel = gitHubWorkflowConfig.portalJourney.slackChannel
    await workflowRunNotificationHandler(server, message, slackChannel)
  }
}

export { handle }
