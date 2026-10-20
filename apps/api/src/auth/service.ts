import type {
	LoginInput,
	RegisterInput,
	Role,
	User,
	UserStatus,
	VerificationCodeInput,
	VerifyEmailInput,
} from "@amlak/shared";
import { prisma } from "../db.ts";
import { sendEmail } from "../email.ts";
import { AppError } from "../errors.ts";
import { toUser } from "../users/present.ts";
import { hashCode, newVerificationCode } from "./codes.ts";
import { hashPassword, verifyPassword } from "./passwords.ts";
import { endSession, type Session, startSession } from "./sessions.ts";

const CODE_LIFETIME_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const RESEND_WAIT_MS = 60 * 1000;
const MAX_CODES_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

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
			verification_tokens: { create: emailCodeToken(code) },
		},
		include: { role: true },
	});

	await sendCodeEmail(user.email, code);
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

export async function sendVerificationCode(
	input: VerificationCodeInput,
): Promise<void> {
	const user = await prisma.user.findUnique({
		where: { email: input.email },
	});
	if (user?.status !== "PENDING_VERIFICATION") {
		return;
	}

	const lastHour = await prisma.verificationToken.findMany({
		where: {
			user_id: user.id,
			token_type: "EMAIL_OTP",
			created_at: { gt: new Date(Date.now() - HOUR_MS) },
		},
		orderBy: { created_at: "desc" },
	});
	const newest = lastHour[0];
	const oldest = lastHour[lastHour.length - 1];
	if (newest && Date.now() - newest.created_at.getTime() < RESEND_WAIT_MS) {
		throw rateLimited(newest.created_at.getTime() + RESEND_WAIT_MS);
	}
	if (oldest && lastHour.length >= MAX_CODES_PER_HOUR) {
		throw rateLimited(oldest.created_at.getTime() + HOUR_MS);
	}

	const code = newVerificationCode();
	await prisma.$transaction([
		prisma.verificationToken.updateMany({
			where: { user_id: user.id, token_type: "EMAIL_OTP", is_used: false },
			data: { is_used: true },
		}),
		prisma.verificationToken.create({
			data: { user_id: user.id, ...emailCodeToken(code) },
		}),
	]);
	await sendCodeEmail(user.email, code);
}

function emailCodeToken(code: string) {
	return {
		token_type: "EMAIL_OTP" as const,
		token_hash: hashCode(code),
		expires_at: new Date(Date.now() + CODE_LIFETIME_MS),
	};
}

function sendCodeEmail(to: string, code: string): Promise<void> {
	return sendEmail({
		to,
		subject: "Your Amlak verification code",
		text: `Your code is ${code}. It expires in 10 minutes.`,
	});
}

function rateLimited(allowedAt: number): AppError {
	const seconds = Math.ceil((allowedAt - Date.now()) / 1000);
	return new AppError("RATE_LIMITED", "Too many codes requested", {
		retry_after_seconds: seconds,
	});
}

export async function login(
	input: LoginInput,
): Promise<{ session: Session; user: User }> {
	const user = await prisma.user.findUnique({
		where: { email: input.email },
		include: { role: true, manager: true },
	});
	if (
		!user?.password_hash ||
		!(await verifyPassword(input.password, user.password_hash))
	) {
		throw new AppError("INVALID_CREDENTIALS", "Wrong email or password");
	}

	const reason = inactiveReason(user.status, user.manager?.status);
	if (reason) {
		throw new AppError("ACCOUNT_NOT_ACTIVE", "This account cannot log in", {
			reason,
		});
	}

	const session = await startSession({
		user_id: user.id,
		role: user.role.name as Role,
	});
	return { session, user: toUser(user) };
}

export async function refresh(
	refreshToken: string | undefined,
): Promise<Session> {
	const userId = refreshToken ? await endSession(refreshToken) : null;
	if (!userId) {
		throw sessionExpired();
	}

	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		include: { role: true, manager: true },
	});
	if (inactiveReason(user.status, user.manager?.status)) {
		throw sessionExpired();
	}
	return startSession({ user_id: user.id, role: user.role.name as Role });
}

export async function logout(refreshToken: string | undefined): Promise<void> {
	if (refreshToken) {
		await endSession(refreshToken);
	}
}

function sessionExpired(): AppError {
	return new AppError(
		"UNAUTHENTICATED",
		"Your session is invalid or has expired",
	);
}

function inactiveReason(status: UserStatus, managerStatus?: UserStatus) {
	if (status === "PENDING_VERIFICATION") return "EMAIL_NOT_VERIFIED";
	if (status === "INVITED") return "INVITATION_PENDING";
	if (status === "DEACTIVATED") return "ACCOUNT_DEACTIVATED";
	if (managerStatus === "DEACTIVATED") return "MANAGER_DEACTIVATED";
	return null;
}
