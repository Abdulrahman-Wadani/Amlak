/**
 * The longest text and the largest number each input accepts. The API checks
 * them in its schemas and the web forms use the same values for maxLength,
 * so a value the form lets through is never refused for its length.
 *
 * Fields that had a limit before keep it (guest name, titles, notes, reasons,
 * support and announcement text, content); the others got one.
 */
export const LIMITS = {
	/** Names of people, places and assets. */
	name: 30,
	/** A booking's guest name (it already allowed 200). */
	guestName: 200,
	/** Content titles, support subjects and announcement titles. */
	title: 200,
	/** Short labels typed by hand: a place or asset type, a city. */
	short: 60,
	address: 200,
	email: 254,
	/** Reasons (cancel, reject) and a place's description. */
	text: 1000,
	/** Ticket descriptions, completion notes, booking notes, expense and schedule descriptions. */
	longText: 2000,
	/** Support requests, admin replies and announcement text. */
	message: 5000,
	/** The body of a content page. */
	body: 100_000,
	/** Amounts, prices and budgets; the database keeps 12 digits with 2 decimals. */
	money: 10_000_000,
	guests: 100,
} as const;
