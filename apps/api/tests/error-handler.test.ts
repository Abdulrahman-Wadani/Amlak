import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/errors.ts";
import { errorHandler } from "../src/middleware/error-handler.ts";

function fakeResponse() {
	const res = {
		set: vi.fn(),
		status: vi.fn(),
		json: vi.fn(),
	};
	res.status.mockReturnValue(res);
	res.json.mockReturnValue(res);
	res.set.mockReturnValue(res);
	return res;
}

const run = (error: unknown) => {
	const res = fakeResponse();
	errorHandler(error as never, {} as never, res as never, vi.fn());
	return res;
};

describe("errorHandler", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});
	afterEach(() => vi.restoreAllMocks());

	it("sends an AppError with its status, code, message and details", () => {
		const res = run(new AppError("CONFLICT", "Name taken", { fields: { name: "taken" } }));

		expect(res.status).toHaveBeenCalledWith(409);
		expect(res.json).toHaveBeenCalledWith({
			code: "CONFLICT",
			message: "Name taken",
			details: { fields: { name: "taken" } },
		});
	});

	it("asks for a Bearer login on UNAUTHENTICATED", () => {
		const res = run(new AppError("UNAUTHENTICATED", "Log in to continue"));

		expect(res.set).toHaveBeenCalledWith("WWW-Authenticate", "Bearer");
	});

	it("sends Retry-After on RATE_LIMITED", () => {
		const res = run(new AppError("RATE_LIMITED", "Too many", { retry_after_seconds: 42 }));

		expect(res.status).toHaveBeenCalledWith(429);
		expect(res.set).toHaveBeenCalledWith("Retry-After", "42");
	});

	it("hides unexpected errors behind a generic 500 and logs them", () => {
		const res = run(new Error("database password is hunter2"));

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({
			code: "INTERNAL_ERROR",
			message: "Something went wrong",
		});
		expect(JSON.stringify(res.json.mock.calls)).not.toContain("hunter2");
		expect(console.error).toHaveBeenCalled();
	});

	it("turns invalid JSON bodies into a 422 validation error", () => {
		const res = run({ type: "entity.parse.failed" });

		expect(res.status).toHaveBeenCalledWith(422);
		expect(res.json).toHaveBeenCalledWith({
			code: "VALIDATION_ERROR",
			message: "The request body is not valid JSON",
		});
	});
});
