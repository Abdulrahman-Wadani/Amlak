import type { Language } from "@amlak/shared";
import { config } from "../config.ts";
import type { Notice } from "../notifications.ts";
import type { EmailText } from "../tickets/messages.ts";

/** What the messages say about the resolved request. */
type ResolvedFacts = { subject: string; response: string };

export function resolvedNotice(
	language: Language,
	facts: ResolvedFacts,
): Notice {
	if (language === "ar") {
		return {
			title: `تم حل طلب الدعم: ${facts.subject}`,
			message: facts.response,
		};
	}
	return {
		title: `Your support request is resolved: ${facts.subject}`,
		message: facts.response,
	};
}

/** Sent to the submitter. The subject is the notification's title. */
export function resolvedEmail(
	language: Language,
	facts: ResolvedFacts & { recipientName: string },
): EmailText {
	const subject = resolvedNotice(language, facts).title;
	if (language === "ar") {
		return {
			subject,
			body: [
				`مرحبًا ${facts.recipientName}،`,
				"رد فريق أملاك على طلبك:",
				facts.response,
				`افتح أملاك: ${config.APP_URL}`,
			].join("\n\n"),
		};
	}
	return {
		subject,
		body: [
			`Hello ${facts.recipientName},`,
			"The Amlak team answered your request:",
			facts.response,
			`Open Amlak: ${config.APP_URL}`,
		].join("\n\n"),
	};
}
