import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashCode, newLinkToken, newVerificationCode } from "../src/auth/codes.ts";
import { hashPassword, verifyPassword } from "../src/auth/passwords.ts";
import { signAccessToken, verifyAccessToken } from "../src/auth/tokens.ts";

const USER_ID = "3f2b8c1e-9a4d-4e7b-8c2a-1d5f6e7a8b9c";

describe("verification codes", () => {
	it("are always six digits, with leading zeros kept", () => {
		for (let i = 0; i < 200; i++) {
			expect(newVerificationCode()).toMatch(/^\d{6}$/);
		}
	});

	it("hash to a fixed SHA-256 hex string, so a stored hash can be checked", () => {
		expect(hashCode("123456")).toBe(
			"8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
		);
		expect(hashCode("123456")).toBe(createHash("sha256").update("123456").digest("hex"));
	});

	it("never stores the code itself in the hash", () => {
		expect(hashCode("654321")).not.toContain("654321");
	});
});

describe("link tokens", () => {
	it("are URL-safe and long enough to guess only with great difficulty", () => {
		const token = newLinkToken();

		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(token.length).toBe(43); // 32 random bytes, base64url without padding
	});

	it("are different every time", () => {
		expect(newLinkToken()).not.toBe(newLinkToken());
	});
});

describe("passwords", () => {
	// Bun.password is only available under Bun; stand in for it here.
	const bunPassword = {
		hash: vi.fn(async (plain: string) => `hashed:${plain}`),
		verify: vi.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
	};

	beforeEach(() => {
		vi.stubGlobal("Bun", { password: bunPassword });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it("hashes with Bun.password", async () => {
		await expect(hashPassword("Passw0rd!")).resolves.toBe("hashed:Passw0rd!");
		expect(bunPassword.hash).toHaveBeenCalledWith("Passw0rd!");
	});

	it("accepts the right password and rejects a wrong one", async () => {
		await expect(verifyPassword("Passw0rd!", "hashed:Passw0rd!")).resolves.toBe(true);
		await expect(verifyPassword("wrong", "hashed:Passw0rd!")).resolves.toBe(false);
	});
});

describe("access tokens", () => {
	it("round-trip the user id and role", async () => {
		const token = await signAccessToken({ user_id: USER_ID, role: "MANAGER" });

		await expect(verifyAccessToken(token)).resolves.toEqual({
			user_id: USER_ID,
			role: "MANAGER",
		});
	});

	it("reject a token with a changed payload", async () => {
		const token = await signAccessToken({ user_id: USER_ID, role: "WORKER" });
		const [header, , signature] = token.split(".");
		const forged = Buffer.from(
			JSON.stringify({ user_id: USER_ID, role: "ADMIN", iat: 1, exp: 9999999999 }),
		).toString("base64url");

		await expect(verifyAccessToken(`${header}.${forged}.${signature}`)).rejects.toThrow();
	});

	it("reject a role that the app does not know", async () => {
		const token = await signAccessToken({ user_id: USER_ID, role: "SUPERUSER" as never });

		await expect(verifyAccessToken(token)).rejects.toThrow();
	});

	it("reject garbage", async () => {
		await expect(verifyAccessToken("not-a-token")).rejects.toThrow();
	});
});
