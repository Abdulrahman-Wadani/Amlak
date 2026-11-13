import type { RequestHandler, Response } from "express";
import type { AuthUser } from "../auth/tokens.ts";
import { requireAuth } from "./require-auth.ts";

/**
 * For public routes that show more to some users. Without a token the
 * request goes on as a visitor; a token that is sent must be valid.
 */
export const optionalAuth: RequestHandler = async (req, res, next) => {
	if (!req.headers.authorization) {
		next();
		return;
	}
	await requireAuth(req, res, next);
};

/** The logged-in user, or null for a visitor. Needs optionalAuth before it. */
export function viewer(res: Response): AuthUser | null {
	const user = res.locals.user as AuthUser | undefined;
	return user ?? null;
}
