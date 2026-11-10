import type { Language } from "@amlak/shared";
import { config } from "../config.ts";
import type { Notice } from "../notifications.ts";

/** An email's text in one language. */
export type EmailText = { subject: string; body: string };

/** What every message says about the ticket. */
export type TicketFacts = { placeName: string; description: string };
export type DueTicketFacts = TicketFacts & { dueDate: string };

// In-app notifications, one per event.

export function submittedNotice(
	language: Language,
	facts: TicketFacts,
): Notice {
	const message = `${facts.placeName}: ${facts.description}`;
	if (language === "ar") {
		return { title: "بلاغ صيانة جديد", message };
	}
	return { title: "New maintenance ticket", message };
}

export function assignedNotice(
	language: Language,
	facts: DueTicketFacts,
): Notice {
	if (language === "ar") {
		return {
			title: `مهمة صيانة جديدة في ${facts.placeName}`,
			message: `${facts.placeName}: ${facts.description} (الموعد ${facts.dueDate})`,
		};
	}
	return {
		title: `New maintenance task at ${facts.placeName}`,
		message: `${facts.placeName}: ${facts.description} (due ${facts.dueDate})`,
	};
}

export function rejectedNotice(
	language: Language,
	facts: TicketFacts & { reason: string },
): Notice {
	if (language === "ar") {
		return {
			title: "رُفض بلاغ الصيانة",
			message: `${facts.placeName}: ${facts.description} (السبب: ${facts.reason})`,
		};
	}
	return {
		title: "Maintenance ticket rejected",
		message: `${facts.placeName}: ${facts.description} (reason: ${facts.reason})`,
	};
}

export function completedNotice(
	language: Language,
	facts: TicketFacts,
): Notice {
	const message = `${facts.placeName}: ${facts.description}`;
	if (language === "ar") {
		return { title: "اكتملت مهمة صيانة", message };
	}
	return { title: "Maintenance ticket completed", message };
}

export function reminderNotice(
	language: Language,
	facts: DueTicketFacts,
): Notice {
	if (language === "ar") {
		return {
			title: `تذكير: صيانة غدًا في ${facts.placeName}`,
			message: `${facts.placeName}: ${facts.description} (غدًا ${facts.dueDate})`,
		};
	}
	return {
		title: `Reminder: maintenance due tomorrow at ${facts.placeName}`,
		message: `${facts.placeName}: ${facts.description} (due tomorrow, ${facts.dueDate})`,
	};
}

export function overdueNotice(
	language: Language,
	facts: DueTicketFacts,
): Notice {
	if (language === "ar") {
		return {
			title: `صيانة متأخرة في ${facts.placeName}`,
			message: `${facts.placeName}: ${facts.description} (كان موعدها ${facts.dueDate})`,
		};
	}
	return {
		title: `Overdue maintenance at ${facts.placeName}`,
		message: `${facts.placeName}: ${facts.description} (was due ${facts.dueDate})`,
	};
}

// Emails. The subject is the matching notification's title.

/** Sent to the assignee when a ticket is assigned to them. */
export function assignedEmail(
	language: Language,
	facts: DueTicketFacts & { recipientName: string },
): EmailText {
	const subject = assignedNotice(language, facts).title;
	if (language === "ar") {
		return {
			subject,
			body: [
				`مرحبًا ${facts.recipientName}،`,
				`أُسندت إليك مهمة صيانة في ${facts.placeName}:`,
				facts.description,
				`الموعد: ${facts.dueDate}`,
				`افتح أملاك: ${config.APP_URL}`,
			].join("\n\n"),
		};
	}
	return {
		subject,
		body: [
			`Hello ${facts.recipientName},`,
			`A maintenance task at ${facts.placeName} is assigned to you:`,
			facts.description,
			`Due: ${facts.dueDate}`,
			`Open Amlak: ${config.APP_URL}`,
		].join("\n\n"),
	};
}

/** Sent to the assignee the day before the ticket is due. */
export function reminderEmail(
	language: Language,
	facts: DueTicketFacts & { recipientName: string },
): EmailText {
	const subject = reminderNotice(language, facts).title;
	if (language === "ar") {
		return {
			subject,
			body: [
				`مرحبًا ${facts.recipientName}،`,
				`تذكير بمهمة الصيانة المستحقة غدًا في ${facts.placeName}:`,
				facts.description,
				`الموعد: ${facts.dueDate}`,
				`افتح أملاك: ${config.APP_URL}`,
			].join("\n\n"),
		};
	}
	return {
		subject,
		body: [
			`Hello ${facts.recipientName},`,
			`A reminder about the maintenance due tomorrow at ${facts.placeName}:`,
			facts.description,
			`Due: ${facts.dueDate}`,
			`Open Amlak: ${config.APP_URL}`,
		].join("\n\n"),
	};
}

/** Sent to the place's owner when an approved ticket passes its due date. */
export function overdueEmail(
	language: Language,
	facts: DueTicketFacts & { recipientName: string; assigneeName: string },
): EmailText {
	const subject = overdueNotice(language, facts).title;
	if (language === "ar") {
		return {
			subject,
			body: [
				`مرحبًا ${facts.recipientName}،`,
				`لم تكتمل مهمة الصيانة هذه في ${facts.placeName} وقد تجاوزت موعدها:`,
				facts.description,
				`الموعد: ${facts.dueDate}`,
				`المسؤول عنها: ${facts.assigneeName}`,
				`افتح أملاك: ${config.APP_URL}`,
			].join("\n\n"),
		};
	}
	return {
		subject,
		body: [
			`Hello ${facts.recipientName},`,
			`This maintenance task at ${facts.placeName} is past its due date and not completed:`,
			facts.description,
			`Due: ${facts.dueDate}`,
			`Assigned to: ${facts.assigneeName}`,
			`Open Amlak: ${config.APP_URL}`,
		].join("\n\n"),
	};
}
