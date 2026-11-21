import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingRow } from "../src/bookings/access.ts";
import { toBooking } from "../src/bookings/present.ts";
import { toPlaceHealth } from "../src/dashboard/present.ts";
import { Prisma } from "../src/generated/prisma/client.ts";
import { type PlaceSums, toPlaceFinancials } from "../src/reports/present.ts";

const PLACE_ID = "3f2b8c1e-9a4d-4e7b-8c2a-1d5f6e7a8b9c";
const TIMESTAMP = new Date("2026-11-01T10:00:00Z");

function placeRow(overrides: Record<string, unknown> = {}) {
	return {
		id: PLACE_ID,
		owner_id: "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
		place_name: "Sea View Villa",
		place_type: "Villa",
		city: "Jeddah",
		status: "ACTIVE",
		currency: "SAR",
		timezone: "Asia/Riyadh",
		monthly_maintenance_budget: null,
		...overrides,
	} as never;
}

function bookingRow(
	overrides: Partial<Record<string, unknown>> = {},
): BookingRow {
	return {
		id: "b1",
		place_id: PLACE_ID,
		created_by: "u1",
		guest_name: "Sara Ahmed",
		guest_phone: "+966500000000",
		guest_email: null,
		guest_count: 2,
		check_in_date: new Date("2026-11-18T00:00:00Z"),
		check_out_date: new Date("2026-11-20T00:00:00Z"),
		total_price: new Prisma.Decimal("1500.50"),
		status: "CONFIRMED",
		notes: null,
		cancelled_at: null,
		cancelled_by: null,
		cancellation_reason: null,
		checked_in_at: null,
		checked_in_by: null,
		checked_out_at: null,
		checked_out_by: null,
		created_at: TIMESTAMP,
		updated_at: TIMESTAMP,
		place: { currency: "SAR", timezone: "Asia/Riyadh" },
		...overrides,
	} as unknown as BookingRow;
}

describe("toBooking", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// 12:00 UTC on 18 Nov is 15:00 in Riyadh, so today there is the 18th.
		vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));
	});
	afterEach(() => vi.useRealTimers());

	it("shows dates as YYYY-MM-DD and money as a plain number in the place's currency", () => {
		const booking = toBooking(bookingRow(), null);

		expect(booking.check_in_date).toBe("2026-11-18");
		expect(booking.check_out_date).toBe("2026-11-20");
		expect(booking.total_price).toBe(1500.5);
		expect(booking.currency).toBe("SAR");
	});

	it("marks a confirmed guest ready on the check-in day when the place is free", () => {
		expect(toBooking(bookingRow(), null).ready_for_check_in).toBe(true);
	});

	it("is not ready while another guest is staying", () => {
		expect(toBooking(bookingRow(), "other-booking").ready_for_check_in).toBe(
			false,
		);
	});

	it("is not ready before the check-in date", () => {
		const row = bookingRow({ check_in_date: new Date("2026-11-19T00:00:00Z") });

		expect(toBooking(row, null).ready_for_check_in).toBe(false);
	});

	it("is not ready once the guest has checked in", () => {
		expect(
			toBooking(bookingRow({ status: "CHECKED_IN" }), null).ready_for_check_in,
		).toBe(false);
	});
});

describe("toPlaceFinancials", () => {
	it("adds up income and expenses, and gives the profit as income minus expenses", () => {
		const sums: PlaceSums = {
			place: placeRow(),
			income: new Prisma.Decimal("5000.10"),
			expenses: new Prisma.Decimal("1200.25"),
			byCategory: {
				MAINTENANCE: new Prisma.Decimal("1000"),
				UTILITIES: new Prisma.Decimal("200.25"),
				TAXES: new Prisma.Decimal(0),
				CLEANING: new Prisma.Decimal(0),
				SUPPLIES: new Prisma.Decimal(0),
				OTHER: new Prisma.Decimal(0),
			},
		};

		const report = toPlaceFinancials(sums);

		expect(report).toMatchObject({
			place_id: PLACE_ID,
			place_name: "Sea View Villa",
			currency: "SAR",
			total_income: 5000.1,
			total_expenses: 1200.25,
			profit: 3799.85,
		});
		expect(report.expenses_by_category).toEqual({
			MAINTENANCE: 1000,
			UTILITIES: 200.25,
			TAXES: 0,
			CLEANING: 0,
			SUPPLIES: 0,
			OTHER: 0,
		});
	});
});

describe("toPlaceHealth", () => {
	const emptyCounts = {
		assets: [],
		tickets: [],
		overdue: [],
		checkIns: [],
		checkOuts: [],
		spent: [],
	};

	it("counts assets, open tickets and today's guests for the place", () => {
		const health = toPlaceHealth(
			placeRow(),
			{
				...emptyCounts,
				assets: [
					{ place_id: PLACE_ID, status: "GOOD", _count: { _all: 4 } },
					{ place_id: PLACE_ID, status: "OUT_OF_SERVICE", _count: { _all: 1 } },
				],
				tickets: [
					{ place_id: PLACE_ID, status: "PENDING_REVIEW", _count: { _all: 2 } },
				],
				overdue: [{ place_id: PLACE_ID, _count: { _all: 1 } }],
				checkIns: [{ place_id: PLACE_ID, _count: { _all: 1 } }],
			},
			"MANAGER",
		);

		expect(health.assets).toEqual({
			GOOD: 4,
			NEEDS_MAINTENANCE: 0,
			UNDER_MAINTENANCE: 0,
			OUT_OF_SERVICE: 1,
		});
		expect(health.open_tickets).toEqual({
			PENDING_REVIEW: 2,
			APPROVED: 0,
			overdue: 1,
		});
		expect(health.today).toEqual({ check_ins: 1, check_outs: 0 });
	});

	it("shows the maintenance budget to managers, with what is left", () => {
		const health = toPlaceHealth(
			placeRow({ monthly_maintenance_budget: new Prisma.Decimal("1500") }),
			{
				...emptyCounts,
				spent: [
					{ place_id: PLACE_ID, _sum: { amount: new Prisma.Decimal("300.5") } },
				],
			},
			"MANAGER",
		);

		expect(health.maintenance_budget).toEqual({
			currency: "SAR",
			budget: 1500,
			spent: 300.5,
			remaining: 1199.5,
		});
	});

	it("hides the budget from workers", () => {
		const health = toPlaceHealth(
			placeRow({ monthly_maintenance_budget: new Prisma.Decimal("1500") }),
			emptyCounts,
			"WORKER",
		);

		expect(health).not.toHaveProperty("maintenance_budget");
	});

	it("reports no budget when the place has none, and zero spent when nothing was spent", () => {
		const noBudget = toPlaceHealth(placeRow(), emptyCounts, "ADMIN");
		expect(noBudget.maintenance_budget).toBeNull();

		const noSpend = toPlaceHealth(
			placeRow({ monthly_maintenance_budget: new Prisma.Decimal("800") }),
			emptyCounts,
			"ADMIN",
		);
		expect(noSpend.maintenance_budget).toMatchObject({
			budget: 800,
			spent: 0,
			remaining: 800,
		});
	});
});
