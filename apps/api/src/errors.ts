const statusByCode = {
	UNAUTHENTICATED: 401,
	INVALID_CREDENTIALS: 401,
	ACCOUNT_NOT_ACTIVE: 403,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	VALIDATION_ERROR: 422,
	RATE_LIMITED: 429,
	INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof statusByCode;

export class AppError extends Error {
	readonly code: ErrorCode;
	readonly status: number;
	readonly details?: Record<string, unknown>;

	constructor(
		code: ErrorCode,
		message: string,
		details?: Record<string, unknown>,
	) {
		super(message);
		this.code = code;
		this.status = statusByCode[code];
		this.details = details;
	}
}
