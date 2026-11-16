import { z } from "zod";
import { PLACE_STATUSES } from "./places.ts";

const count = z.number().int();

export const placeHealthSchema = z
	.object({
		place_id: z.uuid(),
		place_name: z.string(),
		status: z.enum(PLACE_STATUSES),
		assets: z.object({
			GOOD: count,
			NEEDS_MAINTENANCE: count,
			UNDER_MAINTENANCE: count,
			OUT_OF_SERVICE: count,
		}),
		open_tickets: z.object({
			PENDING_REVIEW: count,
			APPROVED: count,
			overdue: count.meta({ description: "APPROVED and past their due_date" }),
		}),
		today: z
			.object({
				check_ins: count.meta({
					description: "CONFIRMED bookings that check in today",
				}),
				check_outs: count.meta({
					description: "CHECKED_IN bookings that check out today",
				}),
			})
			.meta({ description: "Today in the place's time zone" }),
		maintenance_budget: z
			.object({
				currency: z.string(),
				budget: z.number(),
				spent: z.number().meta({
					description: "MAINTENANCE expenses in the current calendar month",
				}),
				remaining: z
					.number()
					.meta({ description: "Negative when over budget" }),
			})
			.nullable()
			.optional()
			.meta({
				description: "null when the place has no budget; never sent to Workers",
			}),
	})
	.meta({ id: "PlaceHealth" });
export type PlaceHealth = z.infer<typeof placeHealthSchema>;

export const dashboardQuerySchema = z.object({
	place_id: z.uuid().optional().meta({ description: "Only this place" }),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
