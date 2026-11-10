import { Resend } from "resend";
import { config } from "./config.ts";

type Email = {
	to: string;
	subject: string;
	text: string;
};

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

// Waits before each retry. A send that still fails after these is thrown.
const RETRY_DELAYS_MS = [1000, 2000, 4000];

/** Sends an email, retrying up to 3 times with longer waits between tries. */
export async function sendEmail(email: Email): Promise<void> {
	if (!resend) {
		console.log(
			`\n[email] To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`,
		);
		return;
	}

	for (let attempt = 0; ; attempt++) {
		try {
			await sendOnce(resend, email);
			return;
		} catch (error) {
			const delay = RETRY_DELAYS_MS[attempt];
			if (delay === undefined) {
				throw error;
			}
			console.warn(`Email to ${email.to} failed; retrying in ${delay} ms`);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
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
