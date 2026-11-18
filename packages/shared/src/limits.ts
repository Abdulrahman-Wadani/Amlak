/**
 * The longest text and the largest number each input accepts. The API checks
 * them in its schemas and the web forms use the same values for maxLength,
 * so a value the form lets through is never refused for its length.
 */
export const LIMITS = {
	/** Names of people, places and assets; titles and subjects. */
	name: 100,
	/** Short labels typed by hand: a place or asset type, a city. */
	short: 60,
	address: 200,
	email: 254,
	/** Descriptions, notes, reasons and replies. */
	text: 1000,
	/** The body of a content page. */
	body: 20_000,
	/** Amounts, prices and budgets; the database keeps 12 digits with 2 decimals. */
	money: 10_000_000,
	guests: 100,
} as const;
