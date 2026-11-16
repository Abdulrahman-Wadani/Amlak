import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type { TokenType } from "../generated/prisma/client.ts";

const RESEND_WAIT_MS = 60 * 1000;
const MAX_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

/**
 * A user can be emailed a code or link of one type once a minute and five
 * times an hour. Otherwise this throws 429 with the seconds to wait.
 */
export async function assertCanSendToken(
	userId: string,
	tokenType: TokenType,
): Promise<void> {
	const lastHour = await prisma.verificationToken.findMany({
		where: {
			user_id: userId,
			token_type: tokenType,
			created_at: { gt: new Date(Date.now() - HOUR_MS) },
		},
		orderBy: { created_at: "desc" },
	});
	const newest = lastHour[0];
	const oldest = lastHour[lastHour.length - 1];
	if (newest && Date.now() - newest.created_at.getTime() < RESEND_WAIT_MS) {
		throw rateLimited(newest.created_at.getTime() + RESEND_WAIT_MS);
	}
	if (oldest && lastHour.length >= MAX_PER_HOUR) {
		throw rateLimited(oldest.created_at.getTime() + HOUR_MS);
	}
}

function rateLimited(allowedAt: number): AppError {
	const seconds = Math.ceil((allowedAt - Date.now()) / 1000);
	return new AppError("RATE_LIMITED", "Too many emails requested", {
		retry_after_seconds: seconds,
	});
}
