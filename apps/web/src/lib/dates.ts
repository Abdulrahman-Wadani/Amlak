/** Today's date as YYYY-MM-DD in a time zone such as "Asia/Riyadh". */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  try {
    // en-CA formats dates as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
