import { financialReportQuerySchema } from "@amlak/shared";
import { Router } from "express";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parse } from "../validation.ts";
import { financialReport } from "./service.ts";

export const reportsRouter = Router();

reportsRouter.get(
	"/reports/financial",
	requireAuth,
	requireRole("MANAGER"),
	async (req, res) => {
		const query = parse(financialReportQuerySchema, req.query);
		res.json(await financialReport(currentUser(res), query));
	},
);
