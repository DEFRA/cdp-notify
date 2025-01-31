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
const serviceToPagerDutyServiceOverride = {
  'cdp-backup': {
    teams: ['platform']
  },
  'cdp-elasticache': {
    teams: ['platform']
  },
  'cdp-lambda': {
    teams: ['platform']
  },
  'cdp-nginx-proxy': {
    teams: ['platform']
  },
  'cdp-opensearch-cluster': {
    teams: ['platform']
  },
  'cdp-opensearch-ingestion': {
    teams: ['platform']
  },
  'cdp-protected-mongo': {
    teams: ['platform']
  },
  'cdp-squid-proxy': {
    teams: ['platform']
  },
  'cdp-waf': {
    teams: ['platform']
  }
}

export { serviceToPagerDutyServiceOverride }
