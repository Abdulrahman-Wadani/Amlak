import { z } from "zod";

export const SUPPORT_TICKET_STATUSES = ["OPEN", "RESOLVED"] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const supportTicketSchema = z
	.object({
		id: z.uuid(),
		user_id: z.uuid().meta({ description: "Who submitted it" }),
		subject: z.string(),
		description: z.string(),
		status: z.enum(SUPPORT_TICKET_STATUSES),
		admin_response: z.string().nullable(),
		resolved_by: z.uuid().nullable(),
		resolved_at: z.iso.datetime().nullable(),
		created_at: z.iso.datetime(),
		updated_at: z.iso.datetime(),
	})
	.meta({ id: "SupportTicket" });
export type SupportTicket = z.infer<typeof supportTicketSchema>;

export const listSupportTicketsQuerySchema = z.object({
	status: z.enum(SUPPORT_TICKET_STATUSES).optional(),
});
export type ListSupportTicketsQuery = z.infer<
	typeof listSupportTicketsQuerySchema
>;

export const createSupportTicketSchema = z.object({
	subject: z.string().trim().min(1).max(200),
	description: z.string().trim().min(1).max(5000),
});
export type CreateSupportTicketInput = z.infer<
	typeof createSupportTicketSchema
>;

export const resolveSupportTicketSchema = z.object({
	admin_response: z.string().trim().min(1).max(5000),
});
export type ResolveSupportTicketInput = z.infer<
	typeof resolveSupportTicketSchema
>;
