import { dashboardQuerySchema } from "@amlak/shared";
import { Router } from "express";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { parse } from "../validation.ts";
import { getDashboard } from "./service.ts";

export const dashboardRouter = Router();

dashboardRouter.get(
	"/dashboard",
	requireAuth,
	requireRole("MANAGER", "WORKER"),
	async (req, res) => {
		const query = parse(dashboardQuerySchema, req.query);
		const page = parsePage(req.query);
		res.json(await getDashboard(currentUser(res), query, page));
	},
);
