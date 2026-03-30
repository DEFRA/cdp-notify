import {
  filterDuplicateAlerts,
  isFromProd
} from '~/src/helpers/sqs/sqs-listener.js'

describe('filterDuplicateAlerts', () => {
  it('should filter out duplicate alerts', () => {
    const alert = {
      service: 'svc',
      environment: 'prod',
      alertURL: 'url',
      status: 'firing',
      startsAt: '2024-01-01T00:00:00Z',
      endsAt: '2024-01-01T01:00:00Z'
    }
    const input = [alert, { ...alert }]
    const result = filterDuplicateAlerts(input)
    expect(result).toHaveLength(1)
  })
})

describe('isFromProd', () => {
  it('should identify raw json messages from prod even if they are invalid', () => {
    const msg = `
[{
      "environment": "prod",
      "team": "foo",
      "teams": "foo",
      "service": "foo",
      "pagerDuty": "false",
      "alertName": "foo-1",
      "status": "firing",
      "startsAt": "2026-03-26T15:18:30Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "summary": "This a multiline msg
It currently breaks things."
      "description": "this line is ok",
      "series": "",
      "runbookUrl": "",
      "alertURL": "https://metrics/"
    }
]`
    expect(isFromProd(msg)).toBe(true)
  })

  it('should return false if the invalid message is not from prod', () => {
    const msg = `
[{
      "environment": "dev",
      "team": "foo",
      "teams": "foo",
      "service": "foo",
      "pagerDuty": "false",
      "alertName": "foo-1",
      "status": "firing",
      "startsAt": "2026-03-26T15:18:30Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "summary": "This a multiline msg
It currently breaks things."
      "description": "this line is ok",
      "series": "",
      "runbookUrl": "",
      "alertURL": "https://metrics/"
    }
]`
    expect(isFromProd(msg)).toBe(false)
  })
})
