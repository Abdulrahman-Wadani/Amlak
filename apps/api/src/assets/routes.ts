import {
	createAssetSchema,
	listAssetsQuerySchema,
	updateAssetSchema,
} from "@amlak/shared";
import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { placeParams } from "../places/routes.ts";
import { parse } from "../validation.ts";
import * as assets from "./service.ts";

export const assetsRouter = Router();

export const assetParams = z.object({ assetId: z.uuid() });
const managerOrWorker = [requireAuth, requireRole("MANAGER", "WORKER")];
const managerOnly = [requireAuth, requireRole("MANAGER")];

assetsRouter.get(
	"/places/:placeId/assets",
	...managerOrWorker,
	async (req, res) => {
		const { placeId } = parse(placeParams, req.params);
		const query = parse(listAssetsQuerySchema, req.query);
		const page = parsePage(req.query);
		res.json(await assets.listAssets(currentUser(res), placeId, query, page));
	},
);

assetsRouter.post(
	"/places/:placeId/assets",
	...managerOnly,
	async (req, res) => {
		const { placeId } = parse(placeParams, req.params);
		const input = parse(createAssetSchema, req.body);
		res
			.status(201)
			.json(await assets.createAsset(currentUser(res), placeId, input));
	},
);

assetsRouter.get("/assets/:assetId", ...managerOrWorker, async (req, res) => {
	const { assetId } = parse(assetParams, req.params);
	res.json(await assets.getAsset(currentUser(res), assetId));
});

assetsRouter.put("/assets/:assetId", ...managerOnly, async (req, res) => {
	const { assetId } = parse(assetParams, req.params);
	const input = parse(updateAssetSchema, req.body);
	res.json(await assets.updateAsset(currentUser(res), assetId, input));
});

assetsRouter.delete("/assets/:assetId", ...managerOnly, async (req, res) => {
	const { assetId } = parse(assetParams, req.params);
	await assets.deleteAsset(currentUser(res), assetId, req.ip);
	res.status(204).end();
});
