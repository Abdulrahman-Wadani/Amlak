import { Writable } from "node:stream";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { redact, requestId } from "../src/logger.ts";
import { routeLabel } from "../src/metrics.ts";

describe("routeLabel", () => {
	it("uses the route template, not the URL", () => {
		expect(routeLabel({ route: { path: "/places/:placeId" } })).toBe(
			"/places/:placeId",
		);
	});

	it("groups requests that matched no route", () => {
		expect(routeLabel({ route: undefined })).toBe("unmatched");
	});
});

describe("requestId", () => {
	it("keeps a safe id sent by the caller", () => {
		expect(requestId("test-123")).toBe("test-123");
	});

	it("replaces a missing or unsafe id with a new one", () => {
		for (const header of [undefined, "", "a b", "x".repeat(65), "<script>"]) {
			expect(requestId(header)).toMatch(/^[0-9a-f-]{36}$/);
		}
	});
});

describe("logger", () => {
	it("redacts passwords, tokens and contact details", () => {
		const lines: string[] = [];
		const sink = new Writable({
			write(chunk, _encoding, done) {
				lines.push(chunk.toString());
				done();
			},
		});
		const log = pino({ redact }, sink);
		log.info(
			{
				password: "hunter2",
				body: { email: "a@b.sa", phone: "0500000000", token: "t0k" },
			},
			"login",
		);
		const line = lines.join("");
		for (const secret of ["hunter2", "a@b.sa", "0500000000", "t0k"]) {
			expect(line).not.toContain(secret);
		}
		expect(line).toContain("[Redacted]");
	});
});
