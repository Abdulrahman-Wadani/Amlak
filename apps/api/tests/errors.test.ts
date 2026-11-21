import { describe, expect, it } from "vitest";
import { AppError } from "../src/errors.ts";

describe("AppError", () => {
	it.each([
		["UNAUTHENTICATED", 401],
		["INVALID_CREDENTIALS", 401],
		["ACCOUNT_NOT_ACTIVE", 403],
		["FORBIDDEN", 403],
		["NOT_FOUND", 404],
		["CONFLICT", 409],
		["VALIDATION_ERROR", 422],
		["RATE_LIMITED", 429],
		["INTERNAL_ERROR", 500],
	] as const)("maps %s to HTTP %i", (code, status) => {
		expect(new AppError(code, "message").status).toBe(status);
	});

	it("keeps the code, message and details", () => {
		const error = new AppError("CONFLICT", "Name taken", {
			fields: { name: "taken" },
		});

		expect(error).toBeInstanceOf(Error);
		expect(error.code).toBe("CONFLICT");
		expect(error.message).toBe("Name taken");
		expect(error.details).toEqual({ fields: { name: "taken" } });
	});

	it("leaves details undefined when none are given", () => {
		expect(new AppError("NOT_FOUND", "Missing").details).toBeUndefined();
	});
});
