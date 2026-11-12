import { z } from "zod"
import {
  createAssetSchema,
  createPlaceSchema,
  loginSchema,
  registerSchema,
} from "@amlak/shared"

export const signInInput = loginSchema

export const signUpInput = registerSchema

export const placeInput = createPlaceSchema

export const assetInput = createAssetSchema

// shortcut: packages/shared has no booking schema on this branch. When
// createBookingSchema lands there, delete this and re-export it instead.
export const bookingInput = z
  .object({
    guest_name: z.string().trim().min(1).max(200),
    guest_phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/),
    guest_email: z.string().email().optional(),
    guest_count: z.coerce.number().int().min(1).max(100),
    check_in_date: z.iso.date(),
    check_out_date: z.iso.date(),
    total_price: z.coerce.number().min(0),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((input) => input.check_out_date > input.check_in_date, {
    path: ["check_out_date"],
  })

export type BookingInput = z.infer<typeof bookingInput>
