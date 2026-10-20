import { registerSchema } from "@amlak/shared";
import { Router } from "express";
import { parse } from "../validation.ts";
import * as auth from "./service.ts";

export const authRouter = Router();

authRouter.post("/auth/register", async (req, res) => {
	const input = parse(registerSchema, req.body);
	res.status(201).json(await auth.register(input));
});
