/** Today's date as YYYY-MM-DD in an IANA time zone, e.g. "Asia/Riyadh". */
export function todayIn(timeZone: string): string {
	// The en-CA locale writes dates as YYYY-MM-DD.
	return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** A YYYY-MM-DD string as the Date that Prisma stores in a `@db.Date` column. */
export function toDbDate(date: string): Date {
	return new Date(`${date}T00:00:00Z`);
}

/** A `@db.Date` value read from Prisma, back to YYYY-MM-DD. */
export function fromDbDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** A YYYY-MM-DD date moved by a number of days (negative goes back). */
export function addDays(date: string, days: number): string {
	const moved = toDbDate(date);
	moved.setUTCDate(moved.getUTCDate() + days);
	return fromDbDate(moved);
}

/**
 * A YYYY-MM-DD date moved forward by calendar months. When the day does not
 * exist in the new month (31 January + 1 month), it becomes that month's
 * last day.
 */
export function addMonths(date: string, months: number): string {
	const [year, month, day] = date.split("-").map(Number);
	// Day 0 of the following month is the last day of the target month.
	const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0));
	const moved = new Date(
		Date.UTC(year, month - 1 + months, Math.min(day, lastDay.getUTCDate())),
	);
	return fromDbDate(moved);
}
