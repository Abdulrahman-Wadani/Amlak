import { z } from "zod";

export const TICKET_TYPES = ["CORRECTIVE", "PREVENTIVE"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUSES = [
	"PENDING_REVIEW",
	"APPROVED",
	"REJECTED",
	"COMPLETED",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const ATTACHMENT_TYPES = ["DAMAGE", "AFTER_REPAIR"] as const;
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

export const ticketAttachmentSchema = z
	.object({
		id: z.uuid(),
		attachment_type: z.enum(ATTACHMENT_TYPES),
		file_url: z
			.string()
			.meta({ description: "A signed link to the photo; works for one hour" }),
		uploaded_by: z.uuid(),
		created_at: z.iso.datetime(),
		updated_at: z.iso.datetime(),
	})
	.meta({ id: "TicketAttachment" });
export type TicketAttachment = z.infer<typeof ticketAttachmentSchema>;

export const ticketSchema = z
	.object({
		id: z.uuid(),
		place_id: z.uuid(),
		asset_id: z.uuid().nullable(),
		periodic_maintenance_id: z.uuid().nullable(),
		ticket_type: z.enum(TICKET_TYPES),
		priority: z.enum(TICKET_PRIORITIES),
		status: z.enum(TICKET_STATUSES),
		description: z.string(),
		reporter_id: z.uuid().nullable(),
		assignee_id: z.uuid().nullable(),
		reviewed_by: z.uuid().nullable(),
		reviewed_at: z.iso.datetime().nullable(),
		rejection_reason: z.string().nullable(),
		estimated_cost: z
			.number()
			.nullable()
			.optional()
			.meta({ description: "Never sent to Workers" }),
		actual_cost: z.number().nullable(),
		due_date: z.iso.date().nullable(),
		is_overdue: z
			.boolean()
			.meta({ description: "APPROVED and past its due_date" }),
		completed_at: z.iso.datetime().nullable(),
		completion_notes: z.string().nullable(),
		attachments: z
			.array(ticketAttachmentSchema)
			.optional()
			.meta({ description: "Single-ticket responses only" }),
		created_at: z.iso.datetime(),
		updated_at: z.iso.datetime(),
	})
	.meta({ id: "MaintenanceTicket" });
export type Ticket = z.infer<typeof ticketSchema>;

/** The text fields of a damage report; the photos come as files. */
export const createTicketSchema = z.object({
	description: z.string().trim().min(1).max(2000),
	priority: z.enum(TICKET_PRIORITIES),
	asset_id: z.uuid().optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const listTicketsQuerySchema = z.object({
	place_id: z.uuid().optional(),
	asset_id: z.uuid().optional(),
	status: z.enum(TICKET_STATUSES).optional(),
	assignee_id: z
		.uuid()
		.optional()
		.meta({ description: 'Pass your own id for "my tasks"' }),
	overdue: z
		.stringbool()
		.optional()
		.meta({ description: "true: APPROVED tickets past their due_date" }),
});
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
