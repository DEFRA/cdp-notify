import { filterDuplicateAlerts } from '~/src/helpers/sqs/sqs-listener.js'

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
