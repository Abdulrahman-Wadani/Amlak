import type { RequestHandler, Response } from "express";
import { type AuthUser, verifyAccessToken } from "../auth/tokens.ts";
import { AppError } from "../errors.ts";

export const requireAuth: RequestHandler = async (req, res, next) => {
	const header = req.headers.authorization;
	if (!header?.startsWith("Bearer ")) {
		throw new AppError("UNAUTHENTICATED", "Log in to continue");
	}

	try {
		res.locals.user = await verifyAccessToken(header.slice("Bearer ".length));
	} catch {
		throw new AppError(
			"UNAUTHENTICATED",
			"Your session is invalid or has expired",
		);
	}
	next();
};

export function currentUser(res: Response): AuthUser {
	const user = res.locals.user as AuthUser | undefined;
	if (!user) {
		throw new Error("currentUser() needs requireAuth before it");
	}
	return user;
}
