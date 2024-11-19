import { format } from 'date-fns'

function formatDate(value, formatString = 'EEEE do MMMM yyyy, HH:mm:ss') {
  return format(value, formatString, { timeZone: 'UTC' })
}

export { formatDate }
