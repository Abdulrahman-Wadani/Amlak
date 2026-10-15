import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors.ts";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
	if (error instanceof AppError) {
		res.status(error.status).json({
			code: error.code,
			message: error.message,
			details: error.details,
		});
		return;
	}

	if (error.type === "entity.parse.failed") {
		res.status(422).json({
			code: "VALIDATION_ERROR",
			message: "The request body is not valid JSON",
		});
		return;
	}

	console.error(error);
	res.status(500).json({
		code: "INTERNAL_ERROR",
		message: "Something went wrong",
	});
};
