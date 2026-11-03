import {
	accessTokenSchema,
	accountSetupSchema,
	assetSchema,
	assignWorkerSchema,
	createAssetSchema,
	createPlaceSchema,
	createWorkerSchema,
	listAssetsQuerySchema,
	listPlacesQuerySchema,
	listWorkersQuerySchema,
	loginResponseSchema,
	loginSchema,
	paginatedSchema,
	placeSchema,
	placeWorkerSchema,
	registerSchema,
	updateAssetSchema,
	updatePlaceSchema,
	updateWorkerSchema,
	userSchema,
	verificationCodeSchema,
	verifyEmailSchema,
	workerSchema,
} from "@amlak/shared";
import { z } from "zod";
import { createDocument } from "zod-openapi";
import { assetParams } from "./assets/routes.ts";
import { pageQuerySchema } from "./pagination.ts";
import { placeWorkerParams } from "./place-workers/routes.ts";
import { placeParams } from "./places/routes.ts";
import { workerParams } from "./workers/routes.ts";

const errorSchema = z
	.object({
		code: z.string().meta({ example: "VALIDATION_ERROR" }),
		message: z.string(),
		details: z.record(z.string(), z.unknown()).optional(),
	})
	.meta({ id: "Error" });

const json = (schema: z.ZodType) => ({
	content: { "application/json": { schema } },
});
const ok = (description: string, schema: z.ZodType) => ({
	description,
	...json(schema),
});
const fail = (description: string) => ok(description, errorSchema);

// Responses that every endpoint behind requireAuth and requireRole can give.
const guarded = {
	"401": fail("Missing, invalid or expired access token"),
	"403": fail("Your role cannot use this endpoint"),
};
const loggedIn = [{ bearerAuth: [] }];

export const openApiDocument = createDocument({
	openapi: "3.1.0",
	info: { title: "Amlak API", version: "1.0.0" },
	servers: [{ url: "/api/v1" }],
	components: {
		securitySchemes: {
			bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
		},
	},
	paths: {
		"/auth/register": {
			post: {
				tags: ["Auth"],
				summary: "Register a Manager and email a verification code",
				requestBody: json(registerSchema),
				responses: {
					"201": ok("The new account, pending verification", userSchema),
					"409": fail("The email is already registered"),
					"422": fail("Some fields are invalid"),
				},
			},
		},
		"/auth/verify-email": {
			post: {
				tags: ["Auth"],
				summary: "Verify the email with the 6-digit code",
				requestBody: json(verifyEmailSchema),
				responses: {
					"204": { description: "Verified; the account can log in" },
					"409": fail("The email is already verified"),
					"422": fail("Wrong or expired code"),
				},
			},
		},
		"/auth/verification-code": {
			post: {
				tags: ["Auth"],
				summary: "Send a new verification code",
				requestBody: json(verificationCodeSchema),
				responses: {
					"204": { description: "Sent, if the account is pending" },
					"429": fail("Wait before asking for another code"),
				},
			},
		},
		"/auth/account-setup": {
			post: {
				tags: ["Auth"],
				summary: "A worker sets their password from the invitation link",
				requestBody: json(accountSetupSchema),
				responses: {
					"204": {
						description: "The account is ACTIVE; the worker can log in",
					},
					"422": fail(
						"The link is wrong, expired or used, or the password is weak",
					),
				},
			},
		},
		"/auth/login": {
			post: {
				tags: ["Auth"],
				summary: "Log in; also sets the refresh_token cookie",
				requestBody: json(loginSchema),
				responses: {
					"200": ok("Logged in", loginResponseSchema),
					"401": fail("Wrong email or password"),
					"403": fail("The account is not active; see details.reason"),
				},
			},
		},
		"/auth/refresh": {
			post: {
				tags: ["Auth"],
				summary: "Get a new access token with the refresh_token cookie",
				responses: {
					"200": ok("A new access token", accessTokenSchema),
					"401": fail("The session has expired; log in again"),
				},
			},
		},
		"/auth/logout": {
			post: {
				tags: ["Auth"],
				summary: "Log out and clear the refresh_token cookie",
				responses: { "204": { description: "Logged out" } },
			},
		},
		"/places": {
			get: {
				tags: ["Places"],
				summary: "List the places you can see",
				security: loggedIn,
				requestParams: {
					query: listPlacesQuerySchema.extend(pageQuerySchema.shape),
				},
				responses: {
					"200": ok("One page of places", paginatedSchema(placeSchema)),
					"422": fail("Invalid filter or page"),
					...guarded,
				},
			},
			post: {
				tags: ["Places"],
				summary: "Add a place (Manager)",
				security: loggedIn,
				requestBody: json(createPlaceSchema),
				responses: {
					"201": ok("The new place", placeSchema),
					"409": fail("You already have a place with this name"),
					"422": fail("Some fields are invalid"),
					...guarded,
				},
			},
		},
		"/places/{placeId}": {
			get: {
				tags: ["Places"],
				summary: "Get a place",
				security: loggedIn,
				requestParams: { path: placeParams },
				responses: {
					"200": ok("The place", placeSchema),
					"404": fail("Place not found"),
					...guarded,
				},
			},
			put: {
				tags: ["Places"],
				summary: "Update a place; omitted fields stay unchanged (Manager)",
				security: loggedIn,
				requestParams: { path: placeParams },
				requestBody: json(updatePlaceSchema),
				responses: {
					"200": ok("The updated place", placeSchema),
					"404": fail("Place not found"),
					"409": fail("You already have a place with this name"),
					"422": fail("Some fields are invalid"),
					...guarded,
				},
			},
			delete: {
				tags: ["Places"],
				summary: "Delete a place (Manager)",
				security: loggedIn,
				requestParams: { path: placeParams },
				responses: {
					"204": { description: "Deleted" },
					"404": fail("Place not found"),
					"409": fail(
						"The place has upcoming or current stays; see details.booking_ids",
					),
					...guarded,
				},
			},
		},
		"/places/{placeId}/assets": {
			get: {
				tags: ["Assets"],
				summary: "List a place's assets",
				security: loggedIn,
				requestParams: {
					path: placeParams,
					query: listAssetsQuerySchema.extend(pageQuerySchema.shape),
				},
				responses: {
					"200": ok("One page of assets", paginatedSchema(assetSchema)),
					"404": fail("Place not found"),
					"422": fail("Invalid filter or page"),
					...guarded,
				},
			},
			post: {
				tags: ["Assets"],
				summary: "Add an asset to a place (Manager)",
				security: loggedIn,
				requestParams: { path: placeParams },
				requestBody: json(createAssetSchema),
				responses: {
					"201": ok("The new asset", assetSchema),
					"404": fail("Place not found"),
					"422": fail(
						"Some fields are invalid, or purchase_date is in the future",
					),
					...guarded,
				},
			},
		},
		"/places/{placeId}/workers": {
			get: {
				tags: ["Place workers"],
				summary: "List the workers assigned to a place (Manager)",
				security: loggedIn,
				requestParams: { path: placeParams, query: pageQuerySchema },
				responses: {
					"200": ok(
						"One page of assignments",
						paginatedSchema(placeWorkerSchema),
					),
					"404": fail("Place not found"),
					...guarded,
				},
			},
			post: {
				tags: ["Place workers"],
				summary: "Assign one of your workers to a place (Manager)",
				security: loggedIn,
				requestParams: { path: placeParams },
				requestBody: json(assignWorkerSchema),
				responses: {
					"201": ok("The assignment", placeWorkerSchema),
					"404": fail("Place not found"),
					"409": fail("The worker is already assigned"),
					"422": fail("Not one of your workers, or deactivated"),
					...guarded,
				},
			},
		},
		"/places/{placeId}/workers/{workerId}": {
			delete: {
				tags: ["Place workers"],
				summary:
					"Unassign a worker; the assignment is kept as history (Manager)",
				security: loggedIn,
				requestParams: { path: placeWorkerParams },
				responses: {
					"204": { description: "Unassigned" },
					"404": fail("Place not found, or the worker is not assigned"),
					"409": fail(
						"The worker has approved tickets here; see details.ticket_ids",
					),
					...guarded,
				},
			},
		},
		"/assets/{assetId}": {
			get: {
				tags: ["Assets"],
				summary: "Get an asset",
				security: loggedIn,
				requestParams: { path: assetParams },
				responses: {
					"200": ok("The asset", assetSchema),
					"404": fail("Asset not found"),
					...guarded,
				},
			},
			put: {
				tags: ["Assets"],
				summary: "Update an asset; omitted fields stay unchanged (Manager)",
				security: loggedIn,
				requestParams: { path: assetParams },
				requestBody: json(updateAssetSchema),
				responses: {
					"200": ok("The updated asset", assetSchema),
					"404": fail("Asset not found"),
					"422": fail(
						"Some fields are invalid, or purchase_date is in the future",
					),
					...guarded,
				},
			},
			delete: {
				tags: ["Assets"],
				summary: "Remove an asset and stop its schedules (Manager)",
				security: loggedIn,
				requestParams: { path: assetParams },
				responses: {
					"204": { description: "Removed" },
					"404": fail("Asset not found"),
					"409": fail("The asset has open tickets; see details.ticket_ids"),
					...guarded,
				},
			},
		},
		"/workers": {
			get: {
				tags: ["Workers"],
				summary: "List my workers (Manager)",
				security: loggedIn,
				requestParams: {
					query: listWorkersQuerySchema.extend(pageQuerySchema.shape),
				},
				responses: {
					"200": ok("One page of workers", paginatedSchema(workerSchema)),
					"422": fail("Invalid filter or page"),
					...guarded,
				},
			},
			post: {
				tags: ["Workers"],
				summary: "Create a worker and email the setup link (Manager)",
				security: loggedIn,
				requestBody: json(createWorkerSchema),
				responses: {
					"201": ok("The new worker, INVITED", workerSchema),
					"409": fail("The email is already registered"),
					"422": fail("Some fields are invalid"),
					...guarded,
				},
			},
		},
		"/workers/{workerId}": {
			get: {
				tags: ["Workers"],
				summary: "Get a worker (Manager)",
				security: loggedIn,
				requestParams: { path: workerParams },
				responses: {
					"200": ok("The worker", workerSchema),
					"404": fail("Worker not found"),
					...guarded,
				},
			},
			put: {
				tags: ["Workers"],
				summary: "Edit, deactivate or reactivate a worker (Manager)",
				security: loggedIn,
				requestParams: { path: workerParams },
				requestBody: json(updateWorkerSchema),
				responses: {
					"200": ok("The updated worker", workerSchema),
					"404": fail("Worker not found"),
					"409": fail(
						"Only a deactivated worker who set up their account can be reactivated",
					),
					"422": fail("Some fields are invalid"),
					...guarded,
				},
			},
			delete: {
				tags: ["Workers"],
				summary: "Delete a worker who never set up their account (Manager)",
				security: loggedIn,
				requestParams: { path: workerParams },
				responses: {
					"204": { description: "Deleted, with their assignments" },
					"404": fail("Worker not found"),
					"409": fail(
						"The worker has set up their account; deactivate them instead",
					),
					...guarded,
				},
			},
		},
	},
});
