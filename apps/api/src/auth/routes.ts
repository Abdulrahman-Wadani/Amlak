import {
	type AccessToken,
	type LoginResponse,
	loginSchema,
	registerSchema,
	verificationCodeSchema,
	verifyEmailSchema,
} from "@amlak/shared";
import { type Response, Router } from "express";
import { parse } from "../validation.ts";
import * as auth from "./service.ts";
import { REFRESH_TOKEN_MS, type Session } from "./sessions.ts";
import { ACCESS_TOKEN_SECONDS } from "./tokens.ts";

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

authRouter.post("/auth/login", async (req, res) => {
	const input = parse(loginSchema, req.body);
	const { session, user } = await auth.login(input);
	setRefreshCookie(res, session.refreshToken);
	const body: LoginResponse = { ...accessTokenBody(session), user };
	res.json(body);
});

authRouter.post("/auth/refresh", async (req, res) => {
	const session = await auth.refresh(req.cookies.refresh_token);
	setRefreshCookie(res, session.refreshToken);
	res.json(accessTokenBody(session));
});

function accessTokenBody(session: Session): AccessToken {
	return {
		access_token: session.accessToken,
		token_type: "Bearer",
		expires_in: ACCESS_TOKEN_SECONDS,
	};
}

function setRefreshCookie(res: Response, token: string) {
	res.cookie("refresh_token", token, {
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		path: "/api/v1/auth",
		maxAge: REFRESH_TOKEN_MS,
	});
}
