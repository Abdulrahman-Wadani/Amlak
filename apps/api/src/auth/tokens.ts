import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { config } from "../config.ts";
import { ROLES } from "./roles.ts";

const secret = new TextEncoder().encode(config.JWT_SECRET);

const accessTokenSchema = z.object({
	user_id: z.uuid(),
	role: z.enum(ROLES),
});

export type AuthUser = z.infer<typeof accessTokenSchema>;

export async function signAccessToken(user: AuthUser): Promise<string> {
	return new SignJWT(user)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("15m")
		.sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AuthUser> {
	const { payload } = await jwtVerify(token, secret);
	return accessTokenSchema.parse(payload);
}
