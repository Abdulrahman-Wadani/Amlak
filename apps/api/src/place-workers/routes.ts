import { assignWorkerSchema } from "@amlak/shared";
import { Router } from "express";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { placeParams } from "../places/routes.ts";
import { parse } from "../validation.ts";
import { workerParams } from "../workers/routes.ts";
import * as placeWorkers from "./service.ts";

export const placeWorkersRouter = Router();

export const placeWorkerParams = placeParams.extend(workerParams.shape);
const managerOnly = [requireAuth, requireRole("MANAGER")];

placeWorkersRouter.get(
	"/places/:placeId/workers",
	...managerOnly,
	async (req, res) => {
		const { placeId } = parse(placeParams, req.params);
		const page = parsePage(req.query);
		res.json(
			await placeWorkers.listPlaceWorkers(currentUser(res), placeId, page),
		);
	},
);

placeWorkersRouter.post(
	"/places/:placeId/workers",
	...managerOnly,
	async (req, res) => {
		const { placeId } = parse(placeParams, req.params);
		const input = parse(assignWorkerSchema, req.body);
		res
			.status(201)
			.json(
				await placeWorkers.assignWorker(
					currentUser(res),
					placeId,
					input,
					req.ip,
				),
			);
	},
);

placeWorkersRouter.delete(
	"/places/:placeId/workers/:workerId",
	...managerOnly,
	async (req, res) => {
		const { placeId, workerId } = parse(placeWorkerParams, req.params);
		await placeWorkers.unassignWorker(
			currentUser(res),
			placeId,
			workerId,
			req.ip,
		);
		res.status(204).end();
	},
);
