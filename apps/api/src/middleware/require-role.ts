import type { RequestHandler } from "express";
import type { AuthUser } from "../auth/tokens.ts";
import { AppError } from "../errors.ts";
import { currentUser } from "./require-auth.ts";

export function requireRole(...roles: AuthUser["role"][]): RequestHandler {
	return (_req, res, next) => {
		if (!roles.includes(currentUser(res).role)) {
			throw new AppError("FORBIDDEN", "Your role cannot use this endpoint");
		}
		next();
	};
}
