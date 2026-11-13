import type { Language } from "@amlak/shared";
import type { EmailText } from "../tickets/messages.ts";

export function passwordResetEmail(
	language: Language,
	facts: { recipientName: string; link: string },
): EmailText {
	if (language === "ar") {
		return {
			subject: "إعادة تعيين كلمة المرور في أملاك",
			body: [
				`مرحبًا ${facts.recipientName}،`,
				"لتعيين كلمة مرور جديدة، افتح هذا الرابط:",
				facts.link,
				"الرابط صالح لمدة 60 دقيقة ويعمل مرة واحدة. إذا لم تطلب ذلك فتجاهل هذه الرسالة.",
			].join("\n\n"),
		};
	}
	return {
		subject: "Reset your Amlak password",
		body: [
			`Hello ${facts.recipientName},`,
			"To set a new password, open this link:",
			facts.link,
			"The link works once and expires in 60 minutes. If you did not ask for it, ignore this email.",
		].join("\n\n"),
	};
}
