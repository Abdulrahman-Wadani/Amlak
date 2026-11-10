import type { Language } from "@amlak/shared";
import { config } from "../config.ts";

/** What a maintenance email or notification says about one ticket. */
export type TicketFacts = {
	recipientName: string;
	placeName: string;
	description: string;
	dueDate: string;
};

/**
 * The same message in two forms: `subject` and `body` for the email,
 * `subject` and `summary` for the in-app notification.
 */
export type Message = { subject: string; summary: string; body: string };

/** Sent to the assignee when a ticket is assigned to them. */
export function assignedMessage(
	language: Language,
	facts: TicketFacts,
): Message {
	if (language === "ar") {
		return {
			subject: `مهمة صيانة جديدة في ${facts.placeName}`,
			summary: `${facts.placeName}: ${facts.description} (الموعد ${facts.dueDate})`,
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
		subject: `New maintenance task at ${facts.placeName}`,
		summary: `${facts.placeName}: ${facts.description} (due ${facts.dueDate})`,
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
export function reminderMessage(
	language: Language,
	facts: TicketFacts,
): Message {
	if (language === "ar") {
		return {
			subject: `تذكير: صيانة غدًا في ${facts.placeName}`,
			summary: `${facts.placeName}: ${facts.description} (غدًا ${facts.dueDate})`,
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
		subject: `Reminder: maintenance due tomorrow at ${facts.placeName}`,
		summary: `${facts.placeName}: ${facts.description} (due tomorrow, ${facts.dueDate})`,
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
export function overdueMessage(
	language: Language,
	facts: TicketFacts & { assigneeName: string },
): Message {
	if (language === "ar") {
		return {
			subject: `صيانة متأخرة في ${facts.placeName}`,
			summary: `${facts.placeName}: ${facts.description} (كان موعدها ${facts.dueDate})`,
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
		subject: `Overdue maintenance at ${facts.placeName}`,
		summary: `${facts.placeName}: ${facts.description} (was due ${facts.dueDate})`,
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
