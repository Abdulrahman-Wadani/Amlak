import type { ForgotPasswordInput, ResetPasswordInput } from "@amlak/shared";
import { config } from "../config.ts";
import { prisma } from "../db.ts";
import { sendEmail } from "../email.ts";
import type { User as UserRow } from "../generated/prisma/client.ts";
import { hashCode, newLinkToken } from "./codes.ts";
import { passwordResetEmail } from "./messages.ts";
import { hashPassword } from "./passwords.ts";
import { assertCanSendToken } from "./rate-limit.ts";
import { invalidLink } from "./service.ts";

const LINK_LIFETIME_MS = 60 * 60 * 1000;

/**
 * Emails a reset link to an ACTIVE account, or to one still waiting for its
 * email check. Any other email gets the same 204, so the response does not
 * tell who has an account. A new link stops the earlier ones working.
 */
export async function requestPasswordReset(
	input: ForgotPasswordInput,
): Promise<void> {
	const user = await prisma.user.findUnique({
		where: { email: input.email },
	});
	if (!user || !canResetPassword(user)) {
		return;
	}
	await assertCanSendToken(user.id, "PASSWORD_RESET");

	const token = newLinkToken();
	await prisma.$transaction([
		prisma.verificationToken.updateMany({
			where: { user_id: user.id, token_type: "PASSWORD_RESET", is_used: false },
			data: { is_used: true },
		}),
		prisma.verificationToken.create({
			data: {
				user_id: user.id,
				token_type: "PASSWORD_RESET",
				token_hash: hashCode(token),
				expires_at: new Date(Date.now() + LINK_LIFETIME_MS),
			},
		}),
	]);

	const link = new URL("/reset-password", config.APP_URL);
	link.searchParams.set("email", user.email);
	link.searchParams.set("token", token);
	const email = passwordResetEmail(user.preferred_language, {
		recipientName: user.fullname,
		link: link.toString(),
	});
	await sendEmail({ to: user.email, subject: email.subject, text: email.body });
}

/**
 * Sets a new password from the link and logs the user out everywhere. An
 * account still waiting for its email check becomes ACTIVE, since opening
 * the link proves the email is theirs.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
	const user = await prisma.user.findUnique({
		where: { email: input.email },
	});
	if (!user || !canResetPassword(user)) {
		throw invalidLink();
	}
	const passwordHash = await hashPassword(input.new_password);

	await prisma.$transaction(async (tx) => {
		// Marking the link used is the check itself, so two requests with the
		// same link cannot both change the password.
		const { count } = await tx.verificationToken.updateMany({
			where: {
				user_id: user.id,
				token_type: "PASSWORD_RESET",
				token_hash: hashCode(input.token),
				is_used: false,
				expires_at: { gt: new Date() },
			},
			data: { is_used: true },
		});
		if (count === 0) {
			throw invalidLink();
		}

		if (user.status === "PENDING_VERIFICATION") {
			await tx.user.update({
				where: { id: user.id },
				data: {
					password_hash: passwordHash,
					status: "ACTIVE",
					email_verified_at: new Date(),
				},
			});
		} else {
			await tx.user.update({
				where: { id: user.id },
				data: { password_hash: passwordHash },
			});
		}
		await tx.refreshToken.updateMany({
			where: { user_id: user.id, revoked_at: null },
			data: { revoked_at: new Date() },
		});
	});
}

// Invited workers use their invitation link; deactivated accounts get nothing.
function canResetPassword(user: UserRow): boolean {
	return user.status === "ACTIVE" || user.status === "PENDING_VERIFICATION";
}
