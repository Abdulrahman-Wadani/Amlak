import { Resend } from "resend";
import { config } from "./config.ts";

export type Email = {
	to: string;
	subject: string;
	text: string;
};

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

// Waits before each retry. A send that still fails after these is thrown.
const RETRY_DELAYS_MS = [1000, 2000, 4000];

// Resend takes at most 100 emails in one batch request.
const BATCH_SIZE = 100;

/** Sends an email, retrying up to 3 times with longer waits between tries. */
export async function sendEmail(email: Email): Promise<void> {
	if (!resend) {
		printEmail(email);
		return;
	}
	await withRetries(email.to, () => sendOnce(resend, email));
}

/**
 * For emails sent after the work is saved, like reminders: a failure after
 * all retries is logged instead of thrown, so it does not undo anything.
 */
export async function sendEmailOrLog(email: Email): Promise<void> {
	try {
		await sendEmail(email);
	} catch (error) {
		console.error("Email failed after retries", email.to, error);
	}
}

/**
 * Sends many emails, 100 per request, each request retried like sendEmail.
 * A batch that still fails is logged, and the next batches are still sent.
 */
export async function sendEmailsOrLog(emails: Email[]): Promise<void> {
	if (!resend) {
		for (const email of emails) {
			printEmail(email);
		}
		return;
	}
	for (let start = 0; start < emails.length; start += BATCH_SIZE) {
		const batch = emails.slice(start, start + BATCH_SIZE);
		const label = `a batch of ${batch.length} emails`;
		try {
			await withRetries(label, () => sendBatchOnce(resend, batch));
		} catch (error) {
			console.error(`Sending ${label} failed after retries`, error);
		}
	}
}

async function withRetries(
	label: string,
	send: () => Promise<void>,
): Promise<void> {
	for (let attempt = 0; ; attempt++) {
		try {
			await send();
			return;
		} catch (error) {
			const delay = RETRY_DELAYS_MS[attempt];
			if (delay === undefined) {
				throw error;
			}
			console.warn(`Sending ${label} failed; retrying in ${delay} ms`);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
}

// Without a Resend key, emails are printed so they can be read in development.
function printEmail(email: Email): void {
	console.log(
		`\n[email] To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`,
	);
}

async function sendOnce(client: Resend, email: Email): Promise<void> {
	const { error } = await client.emails.send({
		from: config.EMAIL_FROM,
		to: email.to,
		subject: email.subject,
		text: email.text,
	});
	if (error) {
		throw new Error(`Email to ${email.to} failed: ${error.message}`);
	}
}

async function sendBatchOnce(client: Resend, emails: Email[]): Promise<void> {
	const { error } = await client.batch.send(
		emails.map((email) => ({
			from: config.EMAIL_FROM,
			to: email.to,
			subject: email.subject,
			text: email.text,
		})),
	);
	if (error) {
		throw new Error(
			`Batch of ${emails.length} emails failed: ${error.message}`,
		);
	}
}
