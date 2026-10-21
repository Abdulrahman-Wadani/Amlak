import { Resend } from "resend";
import { config } from "./config.ts";

type Email = {
	to: string;
	subject: string;
	text: string;
};

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

export async function sendEmail(email: Email): Promise<void> {
	if (!resend) {
		console.log(
			`\n[email] To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`,
		);
		return;
	}

	const { error } = await resend.emails.send({
		from: config.EMAIL_FROM,
		to: email.to,
		subject: email.subject,
		text: email.text,
	});
	if (error) {
		throw new Error(`Email to ${email.to} failed: ${error.message}`);
	}
}
