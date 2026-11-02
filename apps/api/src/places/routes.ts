import {
	createPlaceSchema,
	listPlacesQuerySchema,
	updatePlaceSchema,
} from "@amlak/shared";
import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { parse } from "../validation.ts";
import * as places from "./service.ts";

export const placesRouter = Router();

const placeParams = z.object({ placeId: z.uuid() });
const managerOrWorker = [requireAuth, requireRole("MANAGER", "WORKER")];
const managerOnly = [requireAuth, requireRole("MANAGER")];

placesRouter.get("/places", ...managerOrWorker, async (req, res) => {
	const query = parse(listPlacesQuerySchema, req.query);
	const page = parsePage(req.query);
	res.json(await places.listPlaces(currentUser(res), query, page));
});

placesRouter.post("/places", ...managerOnly, async (req, res) => {
	const input = parse(createPlaceSchema, req.body);
	res.status(201).json(await places.createPlace(currentUser(res), input));
});

placesRouter.get("/places/:placeId", ...managerOrWorker, async (req, res) => {
	const { placeId } = parse(placeParams, req.params);
	res.json(await places.getPlace(currentUser(res), placeId));
});

placesRouter.put("/places/:placeId", ...managerOnly, async (req, res) => {
	const { placeId } = parse(placeParams, req.params);
	const input = parse(updatePlaceSchema, req.body);
	res.json(await places.updatePlace(currentUser(res), placeId, input));
});

placesRouter.delete("/places/:placeId", ...managerOnly, async (req, res) => {
	const { placeId } = parse(placeParams, req.params);
	await places.deletePlace(currentUser(res), placeId, req.ip);
	res.status(204).end();
});
