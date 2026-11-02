import { z } from "zod";

export const PLACE_STATUSES = [
	"ACTIVE",
	"INACTIVE",
	"UNDER_MAINTENANCE",
] as const;
export type PlaceStatus = (typeof PLACE_STATUSES)[number];

export type Place = {
	id: string;
	owner_id: string;
	place_name: string;
	place_type: string;
	description: string | null;
	address: string | null;
	city: string;
	latitude: number | null;
	longitude: number | null;
	status: PlaceStatus;
	/** Never sent to Workers. */
	monthly_maintenance_budget?: number | null;
	currency: string;
	timezone: string;
	created_at: string;
	updated_at: string;
};

const isTimeZone = (name: string) => {
	try {
		new Intl.DateTimeFormat("en", { timeZone: name });
		return true;
	} catch {
		return false;
	}
};

const placeFields = z.object({
	place_name: z.string().trim().min(1),
	place_type: z.string().trim().min(1),
	city: z.string().trim().min(1),
	address: z.string().trim().min(1).nullable().optional(),
	description: z.string().trim().min(1).nullable().optional(),
	latitude: z.number().min(-90).max(90).nullable().optional(),
	longitude: z.number().min(-180).max(180).nullable().optional(),
	status: z.enum(PLACE_STATUSES).optional(),
	monthly_maintenance_budget: z.number().min(0).nullable().optional(),
	currency: z
		.string()
		.regex(/^[A-Z]{3}$/, "Use a 3-letter ISO 4217 code, e.g. SAR")
		.optional(),
	timezone: z
		.string()
		.refine(isTimeZone, "Use an IANA time zone, e.g. Asia/Riyadh")
		.optional(),
});

const presence = (value: number | null | undefined) =>
	value === undefined ? "missing" : value === null ? "cleared" : "set";

const bothCoordinatesOrNeither = {
	check: (place: { latitude?: number | null; longitude?: number | null }) =>
		presence(place.latitude) === presence(place.longitude),
	error: {
		message: "Send latitude and longitude together",
		path: ["latitude"],
	},
};

export const createPlaceSchema = placeFields.refine(
	bothCoordinatesOrNeither.check,
	bothCoordinatesOrNeither.error,
);
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;

/** Every field is optional; currency and timezone cannot change after creation. */
export const updatePlaceSchema = placeFields
	.omit({ currency: true, timezone: true })
	.partial()
	.refine(bothCoordinatesOrNeither.check, bothCoordinatesOrNeither.error);
export type UpdatePlaceInput = z.infer<typeof updatePlaceSchema>;

export const listPlacesQuerySchema = z.object({
	status: z.enum(PLACE_STATUSES).optional(),
});
export type ListPlacesQuery = z.infer<typeof listPlacesQuerySchema>;

export const getPlaceSchema = z.object({
	place_id: z.string().trim().min(1),
});
export type GetPlaceInput = z.infer<typeof getPlaceSchema>;

export const removeWorkerSchema = z.object({
	place_id: z.uuid(),
	worker_id: z.uuid(),
});
export type RemoveWorkerInput = z.infer<typeof removeWorkerSchema>;
