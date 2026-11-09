import { updateProfileSchema } from "@amlak/shared";
import { Router } from "express";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { imageFiles, uploadedImages } from "../uploads/middleware.ts";
import { parse } from "../validation.ts";
import * as users from "./service.ts";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get("/users/me", async (_req, res) => {
	res.json(await users.getMe(currentUser(res)));
});

usersRouter.put("/users/me", imageFiles("picture", 1), async (req, res) => {
	const input = parse(updateProfileSchema, req.body);
	const [picture] = uploadedImages(req);
	res.json(await users.updateMe(currentUser(res), input, picture));
});
