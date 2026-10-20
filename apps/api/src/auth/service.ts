import type { RegisterInput, User } from "@amlak/shared";
import { prisma } from "../db.ts";
import { sendEmail } from "../email.ts";
import { AppError } from "../errors.ts";
import { toUser } from "../users/present.ts";
import { hashCode, newVerificationCode } from "./codes.ts";
import { hashPassword } from "./passwords.ts";

const CODE_LIFETIME_MS = 10 * 60 * 1000;

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
