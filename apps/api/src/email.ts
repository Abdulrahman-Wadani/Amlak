import { config } from "./config.ts";

type Email = {
	to: string;
	subject: string;
	text: string;
};

export async function sendEmail(email: Email): Promise<void> {
	if (config.NODE_ENV === "production") {
		throw new Error("No email provider is configured for production");
	}
	console.log(
		`\n[email] To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`,
	);
}
