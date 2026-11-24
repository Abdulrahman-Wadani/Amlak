import express from "express";
import { app } from "./app.ts";
import { config } from "./config.ts";
import { startJobs } from "./jobs/runner.ts";
import { logger } from "./logger.ts";
import { register } from "./metrics.ts";

app.listen(config.PORT, (error) => {
	if (error) {
		throw error;
	}
	logger.info({ port: config.PORT }, "API listening");
	startJobs();
});

// Metrics on their own port: Caddy only forwards /api/*, and this port is
// not published, so only the log collector on the server can read them.
const metrics = express();
metrics.get("/metrics", async (_req, res) => {
	res.set("Content-Type", register.contentType);
	res.send(await register.metrics());
});
metrics.listen(config.METRICS_PORT, (error) => {
	if (error) {
		throw error;
	}
	logger.info({ port: config.METRICS_PORT }, "Metrics listening");
});
