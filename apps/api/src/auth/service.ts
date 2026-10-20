import type { RegisterInput, User, VerifyEmailInput } from "@amlak/shared";
import { prisma } from "../db.ts";
import { sendEmail } from "../email.ts";
import { AppError } from "../errors.ts";
import { toUser } from "../users/present.ts";
import { hashCode, newVerificationCode } from "./codes.ts";
import { hashPassword } from "./passwords.ts";

const CODE_LIFETIME_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

export async function register(input: RegisterInput): Promise<User> {
	const existing = await prisma.user.findUnique({
		where: { email: input.email },
	});
	if (existing) {
		throw new AppError("CONFLICT", "This email is already registered");
	}

	const managerRole = await prisma.role.findUniqueOrThrow({
		where: { name: "MANAGER" },
	});
	const code = newVerificationCode();
	const user = await prisma.user.create({
		data: {
			fullname: input.fullname,
			email: input.email,
			phone: input.phone,
			preferred_language: input.preferred_language,
			password_hash: await hashPassword(input.password),
			status: "PENDING_VERIFICATION",
			role_id: managerRole.id,
			verification_tokens: {
				create: {
					token_type: "EMAIL_OTP",
					token_hash: hashCode(code),
					expires_at: new Date(Date.now() + CODE_LIFETIME_MS),
				},
			},
		},
		include: { role: true },
	});

	await sendEmail({
		to: user.email,
		subject: "Your Amlak verification code",
		text: `Your code is ${code}. It expires in 10 minutes.`,
	});
	return toUser(user);
}

export async function verifyEmail(input: VerifyEmailInput) {
	const user = await prisma.user.findUnique({
		where: { email: input.email },
	});
	if (user?.email_verified_at) {
		throw new AppError("CONFLICT", "This email is already verified");
	}
	if (user?.status !== "PENDING_VERIFICATION") {
		throw invalidCode();
	}

	const token = await prisma.verificationToken.findFirst({
		where: {
			user_id: user.id,
			token_type: "EMAIL_OTP",
			is_used: false,
			expires_at: { gt: new Date() },
		},
		orderBy: { created_at: "desc" },
	});
	if (!token) {
		throw invalidCode();
	}

	const attempt = await prisma.verificationToken.updateMany({
		where: { id: token.id, attempts: { lt: MAX_CODE_ATTEMPTS } },
		data: { attempts: { increment: 1 } },
	});
	if (attempt.count === 0 || hashCode(input.code) !== token.token_hash) {
		throw invalidCode();
	}

	await prisma.user.update({
		where: { id: user.id },
		data: {
			status: "ACTIVE",
			email_verified_at: new Date(),
			verification_tokens: {
				update: { where: { id: token.id }, data: { is_used: true } },
			},
		},
	});
}

function invalidCode(): AppError {
	return new AppError("VALIDATION_ERROR", "Some fields are invalid", {
		fields: { code: "The code is wrong or has expired" },
	});
}
