
import { z } from "zod";

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
        guest_email: z.email().nullable(),

        guest_count: z.number().int().min(1),

        check_in_date: z.iso.date(),
        check_out_date: z.iso.date(),

        total_price: z.number().min(0),
        currency: z.string(),

        status: z.enum(BOOKING_STATUSES),
        notes: z.string().nullable(),

        ready_for_check_in: z.boolean(),

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

// Create booking request
export const createBookingSchema = z
    .object({
        guest_name: z.string().min(1),
        guest_phone: z.string().regex(
            /^\+[1-9]\d{1,14}$/,
            "Phone number must use E.164 format",
        ),
        guest_email: z.email().optional().nullable(),
        guest_count: z.number().int().min(1),
        check_in_date: z.iso.date(),
        check_out_date: z.iso.date(),
        total_price: z.number().min(0),
        notes: z.string().optional().nullable(),
    })
    .refine(
        (data) => data.check_out_date > data.check_in_date,
        {
            message: "Check-out date must be after check-in date",
            path: ["check_out_date"],
        },
    );

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// Cancel booking request
export const cancelBookingSchema = z.object({
    reason: z.string().min(1),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

// Booking calendar query
export const bookingCalendarQuerySchema = z
    .object({
        from: z.iso.date(),
        to: z.iso.date(),
        status: z.enum(BOOKING_STATUSES).optional(),
        page: z.coerce.number().int().min(1).default(1),
        page_size: z.coerce.number().int().min(1).default(20),
    })
    .refine((data) => data.to >= data.from, {
        message: "The to date must be on or after the from date",
        path: ["to"],
    });

export type BookingCalendarQuery = z.infer<
    typeof bookingCalendarQuerySchema
>;

// Pagination response
export const bookingPaginationSchema = z.object({
    page: z.number().int(),
    page_size: z.number().int(),
    total: z.number().int(),
    total_pages: z.number().int(),
});

export const paginatedBookingsSchema = z.object({
    data: z.array(bookingSchema),
    pagination: bookingPaginationSchema,
});

export type PaginatedBookings = z.infer<
    typeof paginatedBookingsSchema
>;
