import { createScheduleSchema } from "@amlak/shared";
import { Router } from "express";
import { z } from "zod";
import { assetParams } from "../assets/routes.ts";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { parse } from "../validation.ts";
import * as schedules from "./service.ts";

export const schedulesRouter = Router();

export const scheduleParams = z.object({ scheduleId: z.uuid() });
const managerOrWorker = [requireAuth, requireRole("MANAGER", "WORKER")];
const managerOnly = [requireAuth, requireRole("MANAGER")];

schedulesRouter.get(
	"/assets/:assetId/maintenance-schedules",
	...managerOrWorker,
	async (req, res) => {
		const { assetId } = parse(assetParams, req.params);
		const page = parsePage(req.query);
		res.json(await schedules.listSchedules(currentUser(res), assetId, page));
	},
);

schedulesRouter.post(
	"/assets/:assetId/maintenance-schedules",
	...managerOnly,
	async (req, res) => {
		const { assetId } = parse(assetParams, req.params);
		const input = parse(createScheduleSchema, req.body);
		res
			.status(201)
			.json(await schedules.createSchedule(currentUser(res), assetId, input));
	},
);

schedulesRouter.delete(
	"/maintenance-schedules/:scheduleId",
	...managerOnly,
	async (req, res) => {
		const { scheduleId } = parse(scheduleParams, req.params);
		await schedules.stopSchedule(currentUser(res), scheduleId);
		res.status(204).end();
	},
);
