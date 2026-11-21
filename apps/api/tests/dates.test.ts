import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	addDays,
	addMonths,
	fromDbDate,
	toDbDate,
	todayIn,
} from "../src/dates.ts";

describe("todayIn", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("uses the date in the place's time zone, not UTC", () => {
		// 22:30 UTC is already the next day in Riyadh (UTC+3).
		vi.setSystemTime(new Date("2026-11-17T22:30:00Z"));

		expect(todayIn("Asia/Riyadh")).toBe("2026-11-18");
		expect(todayIn("UTC")).toBe("2026-11-17");
	});
});

describe("toDbDate and fromDbDate", () => {
	it("stores a date at midnight UTC and reads it back", () => {
		const stored = toDbDate("2026-11-18");

		expect(stored.toISOString()).toBe("2026-11-18T00:00:00.000Z");
		expect(fromDbDate(stored)).toBe("2026-11-18");
	});
});

describe("addDays", () => {
	it("moves across month and year ends", () => {
		expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
	});

	it("goes back with a negative number", () => {
		expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
	});

	it("handles leap years", () => {
		expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
	});
});

describe("addMonths", () => {
	it("keeps the day when the new month has it", () => {
		expect(addMonths("2026-11-18", 3)).toBe("2027-02-18");
	});

	it("moves to the last day when the new month is shorter", () => {
		expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
		expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
	});

	it("goes back across a year", () => {
		expect(addMonths("2026-03-15", -4)).toBe("2025-11-15");
	});
});
