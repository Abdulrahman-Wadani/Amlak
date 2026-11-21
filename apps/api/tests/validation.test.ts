import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../src/errors.ts";
import { paginated, parsePage } from "../src/pagination.ts";
import { parse } from "../src/validation.ts";

function errorOf(fn: () => unknown): AppError {
	try {
		fn();
	} catch (error) {
		return error as AppError;
	}
	throw new Error("expected an error");
}

describe("parse", () => {
	const schema = z.object({
		name: z.string().min(1),
		amount: z.number(),
		address: z.object({ city: z.string() }),
	});

	it("returns the parsed data when it is valid", () => {
		expect(parse(schema, { name: "A", amount: 1, address: { city: "Jeddah" } })).toEqual({
			name: "A",
			amount: 1,
			address: { city: "Jeddah" },
		});
	});

	it("throws a VALIDATION_ERROR that names each invalid field", () => {
		const error = errorOf(() => parse(schema, { name: "", amount: "x", address: { city: 5 } }));

		expect(error).toBeInstanceOf(AppError);
		expect(error.code).toBe("VALIDATION_ERROR");
		expect(error.status).toBe(422);
		expect(Object.keys(error.details?.fields as object).sort()).toEqual([
			"address.city",
			"amount",
			"name",
		]);
	});

	it("names the whole body when the root value is wrong", () => {
		const error = errorOf(() => parse(z.string(), 42));

		expect(error.details).toEqual({ fields: { body: expect.any(String) } });
	});
});

describe("parsePage", () => {
	it("uses page 1 and 20 rows when nothing is sent", () => {
		expect(parsePage({})).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
	});

	it("reads text numbers and works out the rows to skip", () => {
		expect(parsePage({ page: "3", page_size: "10" })).toEqual({
			page: 3,
			pageSize: 10,
			skip: 20,
			take: 10,
		});
	});

	it("rejects a page below 1", () => {
		expect(() => parsePage({ page: "0" })).toThrow(AppError);
	});

	it("rejects a page size above 100", () => {
		expect(() => parsePage({ page_size: "101" })).toThrow(AppError);
	});
});

describe("paginated", () => {
	it("wraps rows with the total pages rounded up", () => {
		const page = parsePage({ page: "2", page_size: "20" });

		expect(paginated(["a", "b"], 45, page)).toEqual({
			data: ["a", "b"],
			pagination: { page: 2, page_size: 20, total: 45, total_pages: 3 },
		});
	});

	it("reports zero pages when there are no rows", () => {
		const page = parsePage({});

		expect(paginated([], 0, page).pagination.total_pages).toBe(0);
	});
});
