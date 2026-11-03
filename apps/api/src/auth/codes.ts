import { createHash, randomBytes, randomInt } from "node:crypto";

export function newVerificationCode(): string {
	return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashCode(code: string): string {
	return createHash("sha256").update(code).digest("hex");
}

/** A random token for a link in an email, e.g. account setup. Store only its hash. */
export function newLinkToken(): string {
	return randomBytes(32).toString("base64url");
}
