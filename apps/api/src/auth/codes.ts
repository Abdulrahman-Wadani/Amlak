import { createHash, randomInt } from "node:crypto";

export function newVerificationCode(): string {
	return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashCode(code: string): string {
	return createHash("sha256").update(code).digest("hex");
}
