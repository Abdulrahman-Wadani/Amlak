import type { Request, RequestHandler } from "express";
import client from "prom-client";

/** Every metric the API exposes, served on METRICS_PORT (never through Caddy). */
export const register = new client.Registry();
client.collectDefaultMetrics({ register });

const labelNames = ["method", "route", "status_code"] as const;

const requestDuration = new client.Histogram({
	name: "http_request_duration_seconds",
	help: "Time to answer an HTTP request, by route template",
	labelNames,
	buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
	registers: [register],
});

const requestsTotal = new client.Counter({
	name: "http_requests_total",
	help: "HTTP requests answered, by route template",
	labelNames,
	registers: [register],
});

export const jobRuns = new client.Counter({
	name: "amlak_job_runs_total",
	help: "Background job runs, by result",
	labelNames: ["result"] as const,
	registers: [register],
});

/**
 * The route template of a request ("/places/:placeId"), never the raw URL:
 * one value per route keeps the number of series small and holds no ids.
 * The /api/v1 prefix is left out, since Express drops it again when a
 * request ends in an error. Requests that matched no route share one value.
 */
export function routeLabel(req: Pick<Request, "route">): string {
	const path: unknown = req.route?.path;
	return typeof path === "string" ? path : "unmatched";
}

/** Times every request and counts it once the response is sent. */
export const recordMetrics: RequestHandler = (req, res, next) => {
	const stop = requestDuration.startTimer();
	res.on("finish", () => {
		const labels = {
			method: req.method,
			route: routeLabel(req),
			status_code: String(res.statusCode),
		};
		stop(labels);
		requestsTotal.inc(labels);
	});
	next();
};
