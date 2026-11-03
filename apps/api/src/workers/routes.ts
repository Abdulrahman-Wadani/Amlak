import {
	createWorkerSchema,
	listWorkersQuerySchema,
	updateWorkerSchema,
} from "@amlak/shared";
import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { parse } from "../validation.ts";
import * as workers from "./service.ts";

export const workersRouter = Router();

export const workerParams = z.object({ workerId: z.uuid() });
const managerOnly = [requireAuth, requireRole("MANAGER")];

workersRouter.get("/workers", ...managerOnly, async (req, res) => {
	const query = parse(listWorkersQuerySchema, req.query);
	const page = parsePage(req.query);
	res.json(await workers.listWorkers(currentUser(res), query, page));
});

workersRouter.post("/workers", ...managerOnly, async (req, res) => {
	const input = parse(createWorkerSchema, req.body);
	res
		.status(201)
		.json(await workers.createWorker(currentUser(res), input, req.ip));
});

workersRouter.get("/workers/:workerId", ...managerOnly, async (req, res) => {
	const { workerId } = parse(workerParams, req.params);
	res.json(await workers.getWorker(currentUser(res), workerId));
});

workersRouter.put("/workers/:workerId", ...managerOnly, async (req, res) => {
	const { workerId } = parse(workerParams, req.params);
	const input = parse(updateWorkerSchema, req.body);
	res.json(
		await workers.updateWorker(currentUser(res), workerId, input, req.ip),
	);
});

workersRouter.delete("/workers/:workerId", ...managerOnly, async (req, res) => {
	const { workerId } = parse(workerParams, req.params);
	await workers.deleteWorker(currentUser(res), workerId, req.ip);
	res.status(204).end();
});
