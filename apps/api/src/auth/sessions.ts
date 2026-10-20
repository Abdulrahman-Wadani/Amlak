import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../db.ts";
import { type AuthUser, signAccessToken } from "./tokens.ts";

export const REFRESH_TOKEN_MS = 30 * 24 * 60 * 60 * 1000;

export type Session = { accessToken: string; refreshToken: string };

export async function startSession(user: AuthUser): Promise<Session> {
	const refreshToken = randomBytes(32).toString("base64url");
	await prisma.refreshToken.create({
		data: {
			user_id: user.user_id,
			token_hash: hashToken(refreshToken),
			expires_at: new Date(Date.now() + REFRESH_TOKEN_MS),
		},
	});
	return { accessToken: await signAccessToken(user), refreshToken };
}

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}
