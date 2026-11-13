import {
	adminUpdateUserSchema,
	listUsersQuerySchema,
	updateProfileSchema,
} from "@amlak/shared";
import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { imageFiles, uploadedImages } from "../uploads/middleware.ts";
import { parse } from "../validation.ts";
import * as admin from "./admin.ts";
import * as users from "./service.ts";

export const usersRouter = Router();
usersRouter.use(requireAuth);

export const userParams = z.object({ userId: z.uuid() });

usersRouter.get("/users/me", async (_req, res) => {
	res.json(await users.getMe(currentUser(res)));
});

usersRouter.put("/users/me", imageFiles("picture", 1), async (req, res) => {
	const input = parse(updateProfileSchema, req.body);
	const [picture] = uploadedImages(req);
	res.json(await users.updateMe(currentUser(res), input, picture));
});

// The Admin's user management. "/users/me" above is matched first.

usersRouter.get("/users", requireRole("ADMIN"), async (req, res) => {
	const query = parse(listUsersQuerySchema, req.query);
	const page = parsePage(req.query);
	res.json(await admin.listUsers(query, page));
});

usersRouter.get("/users/:userId", requireRole("ADMIN"), async (req, res) => {
	const { userId } = parse(userParams, req.params);
	res.json(await admin.getUser(userId));
});

usersRouter.put("/users/:userId", requireRole("ADMIN"), async (req, res) => {
	const { userId } = parse(userParams, req.params);
	const input = parse(adminUpdateUserSchema, req.body);
	res.json(await admin.updateUser(currentUser(res), userId, input, req.ip));
});
