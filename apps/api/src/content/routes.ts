import {
	createContentSchema,
	listContentQuerySchema,
	updateContentSchema,
} from "@amlak/shared";
import { Router } from "express";
import { z } from "zod";
import { optionalAuth, viewer } from "../middleware/optional-auth.ts";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { parse } from "../validation.ts";
import * as content from "./service.ts";

export const contentRouter = Router();

export const contentParams = z.object({ contentId: z.uuid() });
const adminOnly = [requireAuth, requireRole("ADMIN")];

contentRouter.get("/content", optionalAuth, async (req, res) => {
	const query = parse(listContentQuerySchema, req.query);
	const page = parsePage(req.query);
	res.json(await content.listContent(viewer(res), query, page));
});

contentRouter.post("/content", ...adminOnly, async (req, res) => {
	const input = parse(createContentSchema, req.body);
	res.status(201).json(await content.createContent(currentUser(res), input));
});

contentRouter.get("/content/:contentId", optionalAuth, async (req, res) => {
	const { contentId } = parse(contentParams, req.params);
	res.json(await content.getContent(viewer(res), contentId));
});

contentRouter.put("/content/:contentId", ...adminOnly, async (req, res) => {
	const { contentId } = parse(contentParams, req.params);
	const input = parse(updateContentSchema, req.body);
	res.json(await content.updateContent(contentId, input));
});

contentRouter.delete("/content/:contentId", ...adminOnly, async (req, res) => {
	const { contentId } = parse(contentParams, req.params);
	await content.deleteContent(contentId);
	res.status(204).end();
});
