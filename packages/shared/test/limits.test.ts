import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { z } from "zod";
import {
	adminUpdateUserSchema,
	announcementSchema,
	approveTicketSchema,
	cancelBookingSchema,
	completeTicketSchema,
	createAssetSchema,
	createBookingSchema,
	createContentSchema,
	createExpenseSchema,
	createPlaceSchema,
	createScheduleSchema,
	createSupportTicketSchema,
	createTicketSchema,
	createWorkerSchema,
	LIMITS,
	loginSchema,
	registerSchema,
	rejectTicketSchema,
	resolveSupportTicketSchema,
	updateAssetSchema,
	updateContentSchema,
	updateExpenseSchema,
	updatePlaceSchema,
	updateProfileSchema,
	updateWorkerSchema,
} from "../src/index.ts";

const text = (length: number) => "a".repeat(length);

/** Accepts the value at the limit and refuses one character more, nothing else changed. */
function checksLength(
	schema: z.ZodType,
	base: Record<string, unknown>,
	field: string,
	max: number,
	make: (length: number) => unknown = text,
) {
	const at = schema.safeParse({ ...base, [field]: make(max) });
	assert.ok(
		at.success,
		`${field} at ${max}: ${JSON.stringify(at.error?.issues)}`,
	);
	const over = schema.safeParse({ ...base, [field]: make(max + 1) });
	assert.ok(!over.success, `${field} at ${max + 1} was accepted`);
	assert.deepEqual(over.error.issues[0]?.path, [field]);
}

const uuid = "0f8fad5b-d9cb-469f-a165-70867728950e";
const place = { place_name: "Chalet", place_type: "Chalet", city: "Riyadh" };
const booking = {
	guest_name: "Guest",
	guest_phone: "+966512345678",
	guest_count: 2,
	check_in_date: "2026-12-01",
	check_out_date: "2026-12-03",
	total_price: 500,
};
const expense = {
	category: "SUPPLIES",
	amount: "320",
	expense_date: "2026-11-01",
};
const user = {
	fullname: "Ahmed",
	email: "ahmed@example.com",
	phone: "+966512345678",
};

describe("text limits", () => {
	test("names of people, places and assets: 30", () => {
		assert.equal(LIMITS.name, 30);
		checksLength(createPlaceSchema, place, "place_name", 30);
		checksLength(updatePlaceSchema, {}, "place_name", 30);
		checksLength(createAssetSchema, { type: "AC" }, "name", 30);
		checksLength(updateAssetSchema, {}, "name", 30);
		checksLength(createWorkerSchema, user, "fullname", 30);
		checksLength(updateWorkerSchema, {}, "fullname", 30);
		checksLength(
			registerSchema,
			{ ...user, password: "Passw0rd!" },
			"fullname",
			30,
		);
		checksLength(updateProfileSchema, {}, "fullname", 30);
		checksLength(adminUpdateUserSchema, {}, "fullname", 30);
	});

	test("limits from before this change are kept", () => {
		// Guest names, titles and subjects: 200.
		checksLength(createBookingSchema, booking, "guest_name", 200);
		checksLength(
			createSupportTicketSchema,
			{ description: "Broken" },
			"subject",
			200,
		);
		const content = { language: "en", slug: "about", body: "Hello" };
		checksLength(createContentSchema, content, "title", 200);
		checksLength(updateContentSchema, {}, "title", 200);
		const announcement = {
			role: "MANAGER",
			title_en: "Hi",
			message_en: "Hi",
			title_ar: "Hi",
			message_ar: "Hi",
		};
		checksLength(announcementSchema, announcement, "title_en", 200);
		checksLength(announcementSchema, announcement, "title_ar", 200);

		// Reasons: 1000.
		checksLength(cancelBookingSchema, {}, "reason", 1000);
		checksLength(rejectTicketSchema, {}, "reason", 1000);

		// Ticket descriptions and notes: 2000.
		checksLength(createTicketSchema, { priority: "HIGH" }, "description", 2000);
		checksLength(
			completeTicketSchema,
			{ actual_cost: "100" },
			"completion_notes",
			2000,
		);
		checksLength(createBookingSchema, booking, "notes", 2000);
		checksLength(createExpenseSchema, expense, "description", 2000);
		checksLength(updateExpenseSchema, {}, "description", 2000);
		checksLength(
			createScheduleSchema,
			{
				interval_count: 1,
				interval_unit: "MONTH",
				next_due_date: "2026-12-01",
			},
			"description",
			2000,
		);

		// Support requests, replies and announcement text: 5000.
		checksLength(
			createSupportTicketSchema,
			{ subject: "Help" },
			"description",
			5000,
		);
		checksLength(resolveSupportTicketSchema, {}, "admin_response", 5000);
		checksLength(announcementSchema, announcement, "message_en", 5000);
		checksLength(announcementSchema, announcement, "message_ar", 5000);

		// Content body: 100000.
		checksLength(
			createContentSchema,
			{ title: "About", language: "en", slug: "about" },
			"body",
			100_000,
		);
		checksLength(updateContentSchema, {}, "body", 100_000);
	});

	test("types and cities: 60", () => {
		checksLength(createPlaceSchema, place, "place_type", 60);
		checksLength(createPlaceSchema, place, "city", 60);
		checksLength(createAssetSchema, { name: "AC" }, "type", 60);
	});

	test("addresses: 200, place descriptions: 1000", () => {
		checksLength(createPlaceSchema, place, "address", 200);
		checksLength(createPlaceSchema, place, "description", 1000);
	});

	test("email: 254, login password: 128", () => {
		const email = (length: number) =>
			`${text(length - "@example.com".length)}@example.com`;
		// z.email() refuses a local part over 64 characters, so check the cap on its own.
		const over = loginSchema.safeParse({ email: email(255), password: "x" });
		assert.ok(!over.success);
		checksLength(loginSchema, { email: user.email }, "password", 128);
	});
});

describe("number limits", () => {
	test("amounts up to 10 million", () => {
		assert.equal(LIMITS.money, 10_000_000);
		const money = (value: number) => value;
		checksLength(
			createBookingSchema,
			booking,
			"total_price",
			10_000_000,
			money,
		);
		checksLength(
			createPlaceSchema,
			place,
			"monthly_maintenance_budget",
			10_000_000,
			money,
		);
		checksLength(
			approveTicketSchema,
			{ assignee_id: uuid, due_date: "2026-12-01" },
			"estimated_cost",
			10_000_000,
			money,
		);
		const asText = (value: number) => String(value);
		checksLength(createExpenseSchema, expense, "amount", 10_000_000, asText);
		checksLength(completeTicketSchema, {}, "actual_cost", 10_000_000, asText);
	});

	test("guests up to 100", () => {
		checksLength(createBookingSchema, booking, "guest_count", 100, (n) => n);
	});
});
