# cdp-notify

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
