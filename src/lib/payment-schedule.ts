// Pure rent schedule computation, shared by the API and the lease form preview.
// All dates are handled as UTC calendar days (lease dates are stored at UTC midnight).

const DAY_MS = 24 * 60 * 60 * 1000

// Safety net against absurd inputs (100 years of monthly rent)
export const MAX_SCHEDULE_PERIODS = 1200

export interface PaymentScheduleInput {
  startDate: Date
  endDate: Date // inclusive: last day covered by the lease
  monthlyRent: number
  paymentDay: number // day of month the rent is due (clamped to the month length)
}

export interface ScheduledPayment {
  periodStart: Date
  periodEnd: Date
  dueDate: Date
  amount: number
  isProrated: boolean
}

export function toUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(toUtcDay(date).getTime() + days * DAY_MS)
}

function daysBetweenInclusive(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1
}

/**
 * One payment per calendar month between startDate and endDate.
 * Rent is due on `paymentDay` of each month (or on the period start when the
 * lease starts after that day). Partial first/last months are prorated by day.
 */
export function generatePaymentSchedule(input: PaymentScheduleInput): ScheduledPayment[] {
  const start = toUtcDay(input.startDate)
  const end = toUtcDay(input.endDate)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start ||
    !(input.monthlyRent > 0)
  ) {
    return []
  }

  const paymentDay = Math.min(Math.max(Math.trunc(input.paymentDay) || 1, 1), 31)
  const schedule: ScheduledPayment[] = []

  let year = start.getUTCFullYear()
  let month = start.getUTCMonth()

  while (schedule.length < MAX_SCHEDULE_PERIODS) {
    const monthStart = new Date(Date.UTC(year, month, 1))
    if (monthStart > end) break

    const monthEnd = new Date(Date.UTC(year, month + 1, 0))
    const daysInMonth = monthEnd.getUTCDate()

    const periodStart = start > monthStart ? start : monthStart
    const periodEnd = end < monthEnd ? end : monthEnd
    const coveredDays = daysBetweenInclusive(periodStart, periodEnd)
    const isProrated = coveredDays < daysInMonth

    let dueDate = new Date(Date.UTC(year, month, Math.min(paymentDay, daysInMonth)))
    if (dueDate < periodStart || dueDate > periodEnd) {
      dueDate = periodStart
    }

    schedule.push({
      periodStart,
      periodEnd,
      dueDate,
      amount: isProrated
        ? Math.round((input.monthlyRent * coveredDays) / daysInMonth)
        : input.monthlyRent,
      isProrated,
    })

    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }

  return schedule
}

export function scheduleTotal(schedule: ScheduledPayment[]) {
  return schedule.reduce((sum, payment) => sum + payment.amount, 0)
}
