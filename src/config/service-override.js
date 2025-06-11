// It is assumed that there is a 1:1 mapping from service name to PagerDuty technical service name, and we want to always send alerts for production.
// If the service doesn't exist in cdp-portal-backend, if there is a difference in the name in cdp-portal-backend and in PagerDuty or if we want to
// alert for different environments, an override mapping should be added to this object.
//
// import { environments } from '~/src/config/environments.js'
//  'my-service': {
//     teams: ['platform'],
//     environments: [environments.management, environments.prod],
//     technicalService: 'my_service'
//   }

// todo this is the id from management - make configurable
const platform = {
  teams: [
    {
      name: 'Platform',
      teamId: '3b202138-1689-4397-8b55-4227362b249d'
    }
  ]
}

const platformTenantCko = {
  teams: [
    {
      name: 'Platform-Tenant-Cko',
      teamId: '3b202138-1689-4397-8b55-4227362b249d'
    }
  ]
}

const serviceToTeamOverride = {
  'cdp-backup': platform,
  'cdp-elasticache': platform,
  'cdp-lambda': platform,
  'cdp-nginx-proxy': platform,
  'cdp-opensearch-cluster': platform,
  'cdp-opensearch-ingestion': platform,
  'cdp-protected-mongo': platform,
  'cdp-squid-proxy': platform,
  'cdp-waf': platform,
  'cdp-canary-deployment-backend': platformTenantCko
}

export { serviceToTeamOverride }
