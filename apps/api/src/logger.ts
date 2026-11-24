import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import pino from "pino";
import { routeLabel } from "./metrics.ts";

/** Fields replaced with "[Redacted]", at the top level or one level down. */
export const redact = {
	paths: [
		"password",
		"token",
		"refresh_token",
		"authorization",
		"cookie",
		"email",
		"phone",
		"guest_phone",
		"*.password",
		"*.token",
		"*.refresh_token",
		"*.authorization",
		"*.cookie",
		"*.email",
		"*.phone",
		"*.guest_phone",
	],
};

/**
 * JSON lines on stdout; the server's log collector ships them. Secrets and
 * personal data never reach them (see redact).
 */
export const logger = pino({
	level: process.env.LOG_LEVEL ?? "info",
	redact,
});

const REQUEST_ID = /^[A-Za-z0-9-]{1,64}$/;

/** The caller's x-request-id when it is safe to reuse, else a new one. */
export function requestId(header: string | undefined): string {
	return header && REQUEST_ID.test(header) ? header : randomUUID();
}

/**
 * Gives each request an id (sent back in x-request-id) and logs one line
 * when it ends. Never logs the body, the query string or the headers.
 */
export const logRequests: RequestHandler = (req, res, next) => {
	const id = requestId(req.get("x-request-id"));
	res.locals.requestId = id;
	res.set("x-request-id", id);
	const started = performance.now();
	res.on("finish", () => {
		logger.info(
			{
				request_id: id,
				method: req.method,
				route: routeLabel(req),
				status_code: res.statusCode,
				duration_ms: Math.round(performance.now() - started),
				user_id: res.locals.user?.user_id,
			},
			"request",
		);
	});
	next();
};
