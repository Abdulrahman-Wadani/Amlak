import type { RequestHandler } from "express";
import { AppError } from "../errors.ts";

export const notFound: RequestHandler = (req) => {
	throw new AppError("NOT_FOUND", `No route for ${req.method} ${req.path}`);
};
