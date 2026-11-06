import { updateProfileSchema } from "@amlak/shared";
import { Router } from "express";
import multer from "multer";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { parse } from "../validation.ts";
import * as users from "./service.ts";

export const usersRouter = Router();
usersRouter.use(requireAuth);

// Reads a multipart/form-data body with text fields only. The picture file
// part comes with SCRUM-19.
const formFields = multer().none();

usersRouter.get("/users/me", async (_req, res) => {
	res.json(await users.getMe(currentUser(res)));
});

usersRouter.put("/users/me", formFields, async (req, res) => {
	const input = parse(updateProfileSchema, req.body);
	res.json(await users.updateMe(currentUser(res), input));
});
