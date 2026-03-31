/**
 * Working-day utilities — excludes weekends (Sat/Sun) and Rwanda public holidays.
 */

/** Rwanda public holidays — MM-DD format (repeats annually) */
const RWANDA_HOLIDAYS_ANNUAL: string[] = [
  "01-01", // New Year's Day
  "01-02", // New Year's Holiday
  "02-01", // Heroes' Day
  "04-07", // Genocide Memorial Day
  "05-01", // Labour Day
  "07-01", // Independence Day
  "07-04", // Liberation Day
  "08-15", // Assumption of Mary
  "10-01", // Harvest Festival / Umuganura (approximate)
  "11-01", // All Saints' Day
  "12-25", // Christmas Day
  "12-26", // Boxing Day
]

/** One-off fixed-date holidays (YYYY-MM-DD) — add as needed */
const RWANDA_HOLIDAYS_FIXED: string[] = []

function isHoliday(date: Date): boolean {
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const mmdd = `${mm}-${dd}`
  const yyyymmdd = `${date.getFullYear()}-${mmdd}`
  return RWANDA_HOLIDAYS_ANNUAL.includes(mmdd) || RWANDA_HOLIDAYS_FIXED.includes(yyyymmdd)
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday = 0, Saturday = 6
}

/**
 * Count working days between two ISO date strings (inclusive on both ends).
 * Excludes weekends and Rwanda public holidays.
 */
export function countWorkingDays(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
  if (start > end) return 0

  let count = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    if (!isWeekend(cursor) && !isHoliday(cursor)) {
      count++
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}
