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
