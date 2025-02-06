# cdp-notify

How the pager duty integration works.

`cdp-notify` receives grafana alerts, the same as the email notification service.

Example grafana alert message:

```
{
  environment: 'prod',
  service: 'test-service',
  team: 'Platform',
  alertName: 'test-service - prod',
  status: 'firing',
  startsAt: '2024-11-04 12:53:20 +0000 UTC',
  endsAt: '2024-11-04 12:53:20 +0000 UTC',
  summary: 'A test suite',
  description: '',
  series: '',
  runbookUrl: '',
  alertURL: 'https://grafana/alerting/grafana/0000/view'
}
```

When processing an event the pager duty handler does the following:

1. If the alert does not contain the field `pagerDuty="true"` (note: `"true"` is a quoted string, NOT a boolean) then no alert is sent

2. Decides if the alert comes from an environment we want to handle.
   This is done by comparing the `environment` field in the alert to either: alertEnvironments from config (default: `[prod]`) or to the environment field in `~/src/config/pagerduty-service-overides.js` if an entry exist for that service.
   If there is no match then the alert is not processed

3. Find all pager-duty integration keys for the alert
   This is done in several steps:

   - First, find the team that owns the service.
   - If there is an entry for the service in `~/src/config/pagerduty-service-overides.js` use the teams set there.
   - If not, look up the teams for the service from cdp-portal-backend.
   - For each team see if there is a config entry matching `pagerduty.teams.${team}.integrationKey`
   - If no matches are found check the config for `pagerduty.services.${service}.integrationKey`
   - If no matches are found the alert is not processed.

4. Check if sending alerts is enabled
   If `pagerduty.sendAlerts` is set to false in config no alerts will be sent.
5. Check if alert has a status of either `firing` or `resolve`.
   The status is remapped from `firing` to `trigger` and `resolved` to `resolve`.
6. Generate a deduplication key
   This is a md5 hash of the service, environment and alertURL field.
7. Call the pager duty api
   A payload is built using the integration key, alert details, status and deduplication key.

## PagerDuty Config

### Adding a new tenant service to pager-duty

Find the team name as it appears in portal for the owner of the service.
Ensure the team is setup in pager-duty and an integration key is generated.
In cdp-notify add a new entry to ~/src/config/index.js to `pagerduty.teams`

```
 pagerduty: {
  teams: {
    'my-new-team': {
      integrationKey: {
      doc: 'Integration key for digital service',
      format : String,
      default: 'key',
      env : 'MY_NEW_TEAM_INTEGRATION_KEY'
    }
  }
}
```

In add the team's pagerduty integration key as a secret to cdp-notify with an ID matching the id set in the new config entry (e.g. MY_NEW_TEAM_INTEGRATION_KEY).
Redeploy the service.

### Sending alerts for non-tenant services

To send pager duty alerts for non-tenant services (e.g. mongodb, lambdas, workflows etc) add a new entry to `pagerduty-service-override.js`.

```
{
 'my-non-tenant-service': {
    teams: ['Team-to-Alert']
  }
}
```

Optionally you can specify an array of environment names if you want cdp-notify to alert from non-prod environments.
The name entry in the overrides file must match the service field of the grafana alert. The team must also be configured in cdp-notify (see above).

## Local Dev

Dependencies:

- cdp-portal-stubs
- cdp-user-service-backend
- cdp-portal-backend
- localstack

Queue setup:

```
$ awslocal sqs create-queue --queue-name cdp_grafana_alerts
```

Database Setup

```
use cdp-portal-backend
db.teams.update({}, {$set: {alertEmailAddresses: ["test@email"]}})
```

(this adds test@email to all teams)

Testing locally

```
payload='{"environment":"prod","team":"Platform","service":"cdp-notify","alertName":"cdp-notify-ops - Average Response Time","status":"resolved","startsAt":"2024-11-04 16:42:10 +0000 UTC","endsAt":"2024-11-04 16:47:10 +0000 UTC","summary":"Average Response Time Alert in milliseconds of the responseTime value in Opensearch.","description":"Average Response Time Alert","series":"","runbookUrl":"","alertURL":"https://metrics/alerting/grafana/0/view"}
awslocal sqs send-message --queue-url http://sqs.eu-west-2.127.0.0.1:4566/000000000000/cdp_grafana_alerts --message-body "$payload"
```

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
