import { Router } from "express";
import { prisma } from "./db.ts";

export const healthRouter = Router();

/** Up when the API answers and the database runs a query. No details are sent. */
healthRouter.get("/health", async (_req, res) => {
	try {
		await prisma.$queryRaw`SELECT 1`;
		res.json({ status: "ok" });
	} catch {
		res.status(503).json({ status: "unavailable" });
	}
});
