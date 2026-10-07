// Pure rules used by the scheduled lease/payment status jobs.
import { toUtcDay } from "@/lib/payment-schedule"

const DAY_MS = 24 * 60 * 60 * 1000

// Notices sent before a lease ends, in days (largest first)
export const EXPIRY_NOTICE_DAYS = [60, 30] as const

/** Whole days from `today` until `endDate` (UTC calendar days, negative once past). */
export function daysUntil(endDate: Date, today: Date): number {
  return Math.round((toUtcDay(endDate).getTime() - toUtcDay(today).getTime()) / DAY_MS)
}

export type ExpiryNoticeDecision =
  | { action: "send"; noticeDays: number }
  | { action: "reset" }
  | { action: "none" }

/**
 * Decides whether an expiry notice is due for a lease ending in `daysLeft` days,
 * given the smallest notice already sent (`lastNoticeDays`, null if none).
 * Only the most relevant notice is sent (a lease created 20 days before its end
 * gets the 30-day notice only). When the end date moves back beyond every
 * threshold (lease extended), the marker is reset so notices are sent again.
 */
export function decideExpiryNotice(
  daysLeft: number,
  lastNoticeDays: number | null,
  thresholds: readonly number[] = EXPIRY_NOTICE_DAYS
): ExpiryNoticeDecision {
  const sorted = [...thresholds].sort((a, b) => a - b)
  const largest = sorted[sorted.length - 1]

  if (daysLeft > largest) {
    return lastNoticeDays !== null ? { action: "reset" } : { action: "none" }
  }

  // Lease already ended: expiry is handled by the expiration job
  if (daysLeft < 0) return { action: "none" }

  const applicable = sorted.find((threshold) => daysLeft <= threshold)!
  if (lastNoticeDays === null || applicable < lastNoticeDays) {
    return { action: "send", noticeDays: applicable }
  }

  return { action: "none" }
}
