import { z } from "zod";
import { emailSchema } from "./auth.ts";

export const BOOKING_STATUSES = [
	"CONFIRMED",
	"CHECKED_IN",
	"CHECKED_OUT",
	"CANCELLED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const bookingSchema = z
	.object({
		id: z.uuid(),
		place_id: z.uuid(),
		created_by: z.uuid(),
		guest_name: z.string(),
		guest_phone: z.string(),
		guest_email: z.string().nullable(),
		guest_count: z.number().int(),
		check_in_date: z.iso.date(),
		check_out_date: z.iso.date(),
		total_price: z.number(),
		currency: z.string().meta({ description: "The place's currency" }),
		status: z.enum(BOOKING_STATUSES),
		notes: z.string().nullable(),
		ready_for_check_in: z.boolean().meta({
			description:
				"CONFIRMED, check_in_date has come, and no other guest is staying",
		}),
		cancelled_at: z.iso.datetime().nullable(),
		cancelled_by: z.uuid().nullable(),
		cancellation_reason: z.string().nullable(),
		checked_in_at: z.iso.datetime().nullable(),
		checked_in_by: z.uuid().nullable(),
		checked_out_at: z.iso.datetime().nullable(),
		checked_out_by: z.uuid().nullable(),
		created_at: z.iso.datetime(),
		updated_at: z.iso.datetime(),
	})
	.meta({ id: "Booking" });
export type Booking = z.infer<typeof bookingSchema>;

export const createBookingSchema = z
	.object({
		guest_name: z.string().trim().min(1).max(200),
		guest_phone: z
			.string()
			.trim()
			.regex(
				/^\+[1-9]\d{7,14}$/,
				"Use the international format, e.g. +966512345678",
			),
		guest_email: emailSchema.optional(),
		guest_count: z.number().int().min(1).max(100),
		check_in_date: z.iso.date("Use the YYYY-MM-DD format"),
		check_out_date: z.iso.date("Use the YYYY-MM-DD format").meta({
			description: "The day the guest leaves; the next guest can arrive on it",
		}),
		total_price: z
			.number()
			.min(0)
			.meta({ description: "For the whole stay, in the place's currency" }),
		notes: z.string().trim().max(2000).optional(),
	})
	.refine((input) => input.check_out_date > input.check_in_date, {
		path: ["check_out_date"],
		message: "Must be after check_in_date",
	});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const listBookingsQuerySchema = z
	.object({
		from: z.iso.date("Use the YYYY-MM-DD format"),
		to: z.iso.date("Use the YYYY-MM-DD format"),
		status: z.enum(BOOKING_STATUSES).optional(),
	})
	.refine((query) => query.to >= query.from, {
		path: ["to"],
		message: "Must be on or after from",
	});
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;

export const cancelBookingSchema = z.object({
	reason: z.string().trim().min(1).max(1000),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
