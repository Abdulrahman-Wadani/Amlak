import type { Role } from "./roles.ts";

export const LANGUAGES = ["ar", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const USER_STATUSES = [
	"INVITED",
	"PENDING_VERIFICATION",
	"ACTIVE",
	"DEACTIVATED",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export type User = {
	id: string;
	email: string;
	fullname: string;
	phone: string;
	picture_url: string | null;
	role: Role;
	status: UserStatus;
	preferred_language: Language;
	email_verified_at: string | null;
	manager_id: string | null;
	created_at: string;
	updated_at: string;
};
