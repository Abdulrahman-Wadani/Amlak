import {
	registerSchema,
	verificationCodeSchema,
	verifyEmailSchema,
} from "@amlak/shared";
import { Router } from "express";
import { parse } from "../validation.ts";
import * as auth from "./service.ts";

export const authRouter = Router();

authRouter.post("/auth/register", async (req, res) => {
	const input = parse(registerSchema, req.body);
	res.status(201).json(await auth.register(input));
});

authRouter.post("/auth/verify-email", async (req, res) => {
	const input = parse(verifyEmailSchema, req.body);
	await auth.verifyEmail(input);
	res.status(204).end();
});

authRouter.post("/auth/verification-code", async (req, res) => {
	const input = parse(verificationCodeSchema, req.body);
	await auth.sendVerificationCode(input);
	res.status(204).end();
});
