import { formatDate } from '~/src/helpers/date/format-date.js'

describe('#formatDate', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern')
    jest.setSystemTime(new Date('2023-04-01'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  describe('With defaults', () => {
    test('Date should be in expected format', () => {
      expect(formatDate('2022-01-17T11:40:02.242Z')).toBe(
        'Monday 17th January 2022 at 11:40:02'
      )
    })
  })

  describe('With format attribute', () => {
    test('Date should be in provided format', () => {
      expect(formatDate('2022-01-17T11:40:02.242Z', 'EEEE do MMMM yyyy')).toBe(
        'Monday 17th January 2022'
      )
    })
  })
})
