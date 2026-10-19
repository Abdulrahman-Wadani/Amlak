export const ROLES = ["ADMIN", "MANAGER", "WORKER"] as const;

export type Role = (typeof ROLES)[number];
