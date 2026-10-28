import { ROLES } from "@amlak/shared";
import { jwtVerify, SignJWT, errors } from "jose";
import { z } from "zod";
import { config } from "../config.ts";
import { AppError } from "../errors.ts";

const secret = new TextEncoder().encode(config.JWT_SECRET);
export const ACCESS_TOKEN_SECONDS = 15 * 60;

const accessTokenSchema = z.object({
	user_id: z.uuid(),
	role: z.enum(ROLES),
});

export type AuthUser = z.infer<typeof accessTokenSchema>;

export async function signAccessToken(user: AuthUser): Promise<string> {
	return new SignJWT(user)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(`${ACCESS_TOKEN_SECONDS}s`)
		.sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AuthUser> {
	try{
	const { payload } = await jwtVerify(token, secret);
	return accessTokenSchema.parse(payload);
	}
	catch(error){
		if (error instanceof errors.JWTExpired) {
    		throw new AppError("UNAUTHENTICATED", "Access token expired");
    }

    if (error instanceof errors.JWTClaimValidationFailed) {
      throw new AppError("UNAUTHENTICATED", "Invalid access token");
    }

    throw new AppError("UNAUTHENTICATED", "Invalid or expired access token");
	}	
}
