import {
	accessTokenSchema,
	accountSetupSchema,
	adminUpdateUserSchema,
	announcementResultSchema,
	announcementSchema,
	approveTicketSchema,
	assetSchema,
	assignWorkerSchema,
	bookingSchema,
	cancelBookingSchema,
	completeTicketSchema,
	createAssetSchema,
	createBookingSchema,
	createExpenseSchema,
	createPlaceSchema,
	createScheduleSchema,
	createSupportTicketSchema,
	createTicketSchema,
	createWorkerSchema,
	dashboardQuerySchema,
	expenseSchema,
	financialReportQuerySchema,
	financialReportSchema,
	forgotPasswordSchema,
	listAssetsQuerySchema,
	listBookingsQuerySchema,
	listExpensesQuerySchema,
	listNotificationsQuerySchema,
	listPlacesQuerySchema,
	listSupportTicketsQuerySchema,
	listTicketsQuerySchema,
	listUsersQuerySchema,
	listWorkersQuerySchema,
	loginResponseSchema,
	loginSchema,
	notificationPageSchema,
	notificationSchema,
	paginatedSchema,
	placeHealthSchema,
	placeSchema,
	placeWorkerSchema,
	reassignTicketSchema,
	registerSchema,
	rejectTicketSchema,
	resetPasswordSchema,
	resolveSupportTicketSchema,
	scheduleSchema,
	supportTicketSchema,
	ticketSchema,
	updateAssetSchema,
	updateExpenseSchema,
	updatePlaceSchema,
	updateProfileSchema,
	updateWorkerSchema,
	userSchema,
	verificationCodeSchema,
	verifyEmailSchema,
	workerSchema,
} from "@amlak/shared";
import { z } from "zod";
import { createDocument } from "zod-openapi";
import { assetParams } from "./assets/routes.ts";
import { bookingParams } from "./bookings/routes.ts";
import { expenseParams } from "./expenses/routes.ts";
import { notificationParams } from "./notifications/routes.ts";
import { pageQuerySchema } from "./pagination.ts";
import { placeWorkerParams } from "./place-workers/routes.ts";
import { placeParams } from "./places/routes.ts";
import { scheduleParams } from "./schedules/routes.ts";
import { supportTicketParams } from "./support/routes.ts";
import { ticketParams } from "./tickets/routes.ts";
import { userParams } from "./users/routes.ts";
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
		"/auth/password/forgot": {
			post: {
				tags: ["Auth"],
				summary: "Email a password reset link",
				requestBody: json(forgotPasswordSchema),
				responses: {
					"204": {
						description:
							"Sent if the account is ACTIVE or waiting for its email check; the same response for any other email",
					},
					"429": fail("Wait before asking for another link"),
				},
			},
		},
		"/auth/password/reset": {
			post: {
				tags: ["Auth"],
				summary: "Set a new password from the reset link",
				requestBody: json(resetPasswordSchema),
				responses: {
					"204": {
						description:
							"Changed; every device is logged out. A pending account becomes ACTIVE",
					},
					"422": fail(
						"The link is wrong, expired or used, or the password is weak",
					),
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
		"/users/me": {
			get: {
				tags: ["Profile"],
				summary: "Get my profile (any role)",
				security: loggedIn,
				responses: {
					"200": ok("Your profile", userSchema),
					"401": fail("Missing, invalid or expired access token"),
				},
			},
			put: {
				tags: ["Profile"],
				summary: "Update my name, phone, language or picture (any role)",
				security: loggedIn,
				requestBody: {
					content: {
						"multipart/form-data": {
							schema: updateProfileSchema.extend({
								picture: z
									.file()
									.optional()
									.meta({ description: "JPEG, PNG or WebP, up to 10 MB" }),
							}),
						},
					},
				},
				responses: {
					"200": ok("Your updated profile", userSchema),
					"401": fail("Missing, invalid or expired access token"),
					"422": fail("Some fields are invalid"),
				},
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
		"/places/{placeId}/tickets": {
			post: {
				tags: ["Maintenance tickets"],
				summary:
					"Report damage with photos (Worker on the place, or its Manager)",
				security: loggedIn,
				requestParams: { path: placeParams },
				requestBody: {
					content: {
						"multipart/form-data": {
							schema: createTicketSchema.extend({
								photos: z
									.array(z.file())
									.min(1)
									.max(5)
									.meta({ description: "1 to 5 JPEG, PNG or WebP photos" }),
							}),
						},
					},
				},
				responses: {
					"201": ok("The new ticket, waiting for review", ticketSchema),
					"404": fail("Place not found"),
					"422": fail(
						"Some fields are invalid, a photo is missing, or the asset is not in this place",
					),
					...guarded,
				},
			},
		},
		"/tickets": {
			get: {
				tags: ["Maintenance tickets"],
				summary: "List the tickets you can see",
				security: loggedIn,
				requestParams: {
					query: listTicketsQuerySchema.extend(pageQuerySchema.shape),
				},
				responses: {
					"200": ok(
						"One page of tickets, without attachments",
						paginatedSchema(ticketSchema),
					),
					"422": fail("Invalid filter or page"),
					...guarded,
				},
			},
		},
		"/tickets/{ticketId}": {
			get: {
				tags: ["Maintenance tickets"],
				summary: "Get a ticket with its photos",
				security: loggedIn,
				requestParams: { path: ticketParams },
				responses: {
					"200": ok("The ticket", ticketSchema),
					"404": fail("Ticket not found"),
					...guarded,
				},
			},
		},
		"/tickets/{ticketId}/approve": {
			post: {
				tags: ["Maintenance tickets"],
				summary: "Approve a ticket and assign a worker and due date (Manager)",
				security: loggedIn,
				requestParams: { path: ticketParams },
				requestBody: json(approveTicketSchema),
				responses: {
					"200": ok("The approved ticket", ticketSchema),
					"404": fail("Ticket not found"),
					"409": fail("The ticket is not waiting for review"),
					"422": fail(
						"Some fields are invalid, the assignee is not allowed for this place, or the due date is past",
					),
					...guarded,
				},
			},
		},
		"/tickets/{ticketId}/reject": {
			post: {
				tags: ["Maintenance tickets"],
				summary: "Reject a ticket with a reason (Manager)",
				security: loggedIn,
				requestParams: { path: ticketParams },
				requestBody: json(rejectTicketSchema),
				responses: {
					"200": ok("The rejected ticket", ticketSchema),
					"404": fail("Ticket not found"),
					"409": fail("The ticket is not waiting for review"),
					"422": fail("The reason is missing"),
					...guarded,
				},
			},
		},
		"/tickets/{ticketId}/reassign": {
			post: {
				tags: ["Maintenance tickets"],
				summary: "Change an approved ticket's assignee and due date (Manager)",
				security: loggedIn,
				requestParams: { path: ticketParams },
				requestBody: json(reassignTicketSchema),
				responses: {
					"200": ok("The updated ticket", ticketSchema),
					"404": fail("Ticket not found"),
					"409": fail("The ticket is not approved"),
					"422": fail(
						"Some fields are invalid, the assignee is not allowed for this place, or the due date is past",
					),
					...guarded,
				},
			},
		},
		"/tickets/{ticketId}/complete": {
			post: {
				tags: ["Maintenance tickets"],
				summary: "Complete an approved ticket with after photos (its assignee)",
				security: loggedIn,
				requestParams: { path: ticketParams },
				requestBody: {
					content: {
						"multipart/form-data": {
							schema: completeTicketSchema.extend({
								photos: z
									.array(z.file())
									.min(1)
									.max(5)
									.meta({ description: "1 to 5 JPEG, PNG or WebP photos" }),
							}),
						},
					},
				},
				responses: {
					"200": ok("The completed ticket", ticketSchema),
					"401": fail("Missing, invalid or expired access token"),
					"403": fail("You are not this ticket's assignee"),
					"404": fail("Ticket not found"),
					"409": fail("The ticket is not approved"),
					"422": fail("Some fields are invalid, or no after photo was sent"),
				},
			},
		},
		"/assets/{assetId}/maintenance-schedules": {
			get: {
				tags: ["Maintenance schedules"],
				summary: "List an asset's active schedules",
				security: loggedIn,
				requestParams: { path: assetParams, query: pageQuerySchema },
				responses: {
					"200": ok("One page of schedules", paginatedSchema(scheduleSchema)),
					"404": fail("Asset not found"),
					"422": fail("Invalid page"),
					...guarded,
				},
			},
			post: {
				tags: ["Maintenance schedules"],
				summary: "Schedule periodic maintenance for an asset (Manager)",
				security: loggedIn,
				requestParams: { path: assetParams },
				requestBody: json(createScheduleSchema),
				responses: {
					"201": ok("The new schedule", scheduleSchema),
					"404": fail("Asset not found"),
					"422": fail(
						"Some fields are invalid, the date is past, or default_assignee_id is not allowed for this place",
					),
					...guarded,
				},
			},
		},
		"/maintenance-schedules/{scheduleId}": {
			delete: {
				tags: ["Maintenance schedules"],
				summary: "Stop a schedule (Manager)",
				security: loggedIn,
				requestParams: { path: scheduleParams },
				responses: {
					"204": { description: "Stopped; tickets it created stay" },
					"404": fail("Schedule not found, or already stopped"),
					...guarded,
				},
			},
		},
		"/places/{placeId}/bookings": {
			get: {
				tags: ["Bookings"],
				summary: "Booking calendar: the stays that touch from–to",
				security: loggedIn,
				requestParams: {
					path: placeParams,
					query: listBookingsQuerySchema.safeExtend(pageQuerySchema.shape),
				},
				responses: {
					"200": ok("One page of bookings", paginatedSchema(bookingSchema)),
					"404": fail("Place not found"),
					"422": fail("Invalid dates, filter or page"),
					...guarded,
				},
			},
			post: {
				tags: ["Bookings"],
				summary: "Add a booking",
				security: loggedIn,
				requestParams: { path: placeParams },
				requestBody: json(createBookingSchema),
				responses: {
					"201": ok("The new booking, CONFIRMED", bookingSchema),
					"404": fail("Place not found"),
					"409": fail(
						"The dates overlap another booking; see details.conflicting_booking_id",
					),
					"422": fail(
						"Some fields are invalid, the stay is over, or the place is not ACTIVE",
					),
					...guarded,
				},
			},
		},
		"/bookings/{bookingId}": {
			get: {
				tags: ["Bookings"],
				summary: "Get a booking",
				security: loggedIn,
				requestParams: { path: bookingParams },
				responses: {
					"200": ok("The booking", bookingSchema),
					"404": fail("Booking not found"),
					...guarded,
				},
			},
		},
		"/bookings/{bookingId}/cancel": {
			post: {
				tags: ["Bookings"],
				summary: "Cancel a CONFIRMED booking",
				security: loggedIn,
				requestParams: { path: bookingParams },
				requestBody: json(cancelBookingSchema),
				responses: {
					"200": ok("The cancelled booking", bookingSchema),
					"404": fail("Booking not found"),
					"409": fail("The booking is not CONFIRMED"),
					"422": fail("The reason is missing"),
					...guarded,
				},
			},
		},
		"/bookings/{bookingId}/check-in": {
			post: {
				tags: ["Bookings"],
				summary: "Check the guest in",
				security: loggedIn,
				requestParams: { path: bookingParams },
				responses: {
					"200": ok("The booking, CHECKED_IN", bookingSchema),
					"404": fail("Booking not found"),
					"409": fail(
						"Not CONFIRMED, or not ready: details.reason is BEFORE_CHECK_IN_DATE, or PLACE_OCCUPIED with details.occupied_by_booking_id",
					),
					...guarded,
				},
			},
		},
		"/bookings/{bookingId}/check-out": {
			post: {
				tags: ["Bookings"],
				summary: "Check the guest out",
				security: loggedIn,
				requestParams: { path: bookingParams },
				responses: {
					"200": ok("The booking, CHECKED_OUT", bookingSchema),
					"404": fail("Booking not found"),
					"409": fail("The booking is not CHECKED_IN"),
					...guarded,
				},
			},
		},
		"/dashboard": {
			get: {
				tags: ["Dashboard"],
				summary: "Property and asset health, one row per place you can see",
				security: loggedIn,
				requestParams: {
					query: dashboardQuerySchema.extend(pageQuerySchema.shape),
				},
				responses: {
					"200": ok("One page of places", paginatedSchema(placeHealthSchema)),
					"422": fail("Invalid place_id or page"),
					...guarded,
				},
			},
		},
		"/places/{placeId}/expenses": {
			get: {
				tags: ["Expenses"],
				summary: "List a place's expenses (Manager)",
				security: loggedIn,
				requestParams: {
					path: placeParams,
					query: listExpensesQuerySchema.safeExtend(pageQuerySchema.shape),
				},
				responses: {
					"200": ok("One page of expenses", paginatedSchema(expenseSchema)),
					"404": fail("Place not found"),
					"422": fail("Invalid dates, category or page"),
					...guarded,
				},
			},
			post: {
				tags: ["Expenses"],
				summary: "Log an expense, with an optional receipt photo (Manager)",
				security: loggedIn,
				requestParams: { path: placeParams },
				requestBody: {
					content: {
						"multipart/form-data": {
							schema: createExpenseSchema.extend({
								receipt: z
									.file()
									.optional()
									.meta({ description: "A JPEG, PNG or WebP photo" }),
							}),
						},
					},
				},
				responses: {
					"201": ok("The new expense", expenseSchema),
					"404": fail("Place not found"),
					"422": fail(
						"Some fields are invalid, the receipt is not an image, or the ticket is not in this place",
					),
					...guarded,
				},
			},
		},
		"/expenses/{expenseId}": {
			get: {
				tags: ["Expenses"],
				summary: "Get an expense (Manager)",
				security: loggedIn,
				requestParams: { path: expenseParams },
				responses: {
					"200": ok("The expense", expenseSchema),
					"404": fail("Expense not found"),
					...guarded,
				},
			},
			put: {
				tags: ["Expenses"],
				summary:
					"Update an expense; send only the fields that change (Manager)",
				security: loggedIn,
				requestParams: { path: expenseParams },
				requestBody: {
					content: {
						"multipart/form-data": {
							schema: updateExpenseSchema.extend({
								receipt: z.file().optional().meta({
									description: "Replaces the current receipt photo",
								}),
							}),
						},
					},
				},
				responses: {
					"200": ok("The updated expense", expenseSchema),
					"404": fail("Expense not found"),
					"422": fail(
						"Some fields are invalid, the receipt is not an image, or the ticket is not in this place",
					),
					...guarded,
				},
			},
			delete: {
				tags: ["Expenses"],
				summary: "Delete an expense and its receipt (Manager)",
				security: loggedIn,
				requestParams: { path: expenseParams },
				responses: {
					"204": { description: "Deleted; the audit log keeps its values" },
					"404": fail("Expense not found"),
					...guarded,
				},
			},
		},
		"/reports/financial": {
			get: {
				tags: ["Reports"],
				summary: "Income, expenses and profit for a period (Manager)",
				security: loggedIn,
				requestParams: { query: financialReportQuerySchema },
				responses: {
					"200": ok(
						"One row per place, plus totals per currency",
						financialReportSchema,
					),
					"404": fail("Place not found"),
					"422": fail("Missing or invalid dates or place_id"),
					...guarded,
				},
			},
		},
		"/notifications": {
			get: {
				tags: ["Notifications"],
				summary: "List my notifications, newest first",
				security: loggedIn,
				requestParams: {
					query: listNotificationsQuerySchema.extend(pageQuerySchema.shape),
				},
				responses: {
					"200": ok(
						"One page of my notifications, plus my unread count",
						notificationPageSchema,
					),
					"401": fail("Missing, invalid or expired access token"),
					"422": fail("Invalid filter or page"),
				},
			},
			post: {
				tags: ["Notifications"],
				summary: "Send an announcement to a role or to some users (Admin)",
				security: loggedIn,
				requestBody: json(announcementSchema),
				responses: {
					"201": ok(
						"Saved for every ACTIVE recipient; the emails go out after this response",
						announcementResultSchema,
					),
					"422": fail(
						"Both or neither of role and user_ids, or a missing text",
					),
					...guarded,
				},
			},
		},
		"/notifications/{notificationId}/read": {
			post: {
				tags: ["Notifications"],
				summary: "Mark one of my notifications as read",
				security: loggedIn,
				requestParams: { path: notificationParams },
				responses: {
					"200": ok("The notification, read", notificationSchema),
					"401": fail("Missing, invalid or expired access token"),
					"404": fail("Notification not found"),
				},
			},
		},
		"/users": {
			get: {
				tags: ["Users (Admin)"],
				summary: "List every account (Admin)",
				security: loggedIn,
				requestParams: {
					query: listUsersQuerySchema.extend(pageQuerySchema.shape),
				},
				responses: {
					"200": ok("One page of users", paginatedSchema(userSchema)),
					"422": fail("Invalid filter or page"),
					...guarded,
				},
			},
		},
		"/users/{userId}": {
			get: {
				tags: ["Users (Admin)"],
				summary: "Get any account (Admin)",
				security: loggedIn,
				requestParams: { path: userParams },
				responses: {
					"200": ok("The user", userSchema),
					"404": fail("User not found"),
					...guarded,
				},
			},
			put: {
				tags: ["Users (Admin)"],
				summary: "Edit, deactivate or reactivate any account (Admin)",
				security: loggedIn,
				requestParams: { path: userParams },
				requestBody: json(adminUpdateUserSchema),
				responses: {
					"200": ok("The updated user", userSchema),
					"404": fail("User not found"),
					"409": fail(
						"Only a deactivated user whose email was verified can be reactivated",
					),
					"422": fail("Invalid fields, or an Admin changing their own status"),
					...guarded,
				},
			},
		},
		"/support-tickets": {
			get: {
				tags: ["Support"],
				summary: "List support tickets: all for Admins, my own for others",
				security: loggedIn,
				requestParams: {
					query: listSupportTicketsQuerySchema.extend(pageQuerySchema.shape),
				},
				responses: {
					"200": ok(
						"One page of support tickets",
						paginatedSchema(supportTicketSchema),
					),
					"401": fail("Missing, invalid or expired access token"),
					"422": fail("Invalid filter or page"),
				},
			},
			post: {
				tags: ["Support"],
				summary: "Submit a support ticket (Manager, Worker)",
				security: loggedIn,
				requestBody: json(createSupportTicketSchema),
				responses: {
					"201": ok("The new ticket, OPEN", supportTicketSchema),
					"422": fail("The subject or description is missing"),
					...guarded,
				},
			},
		},
		"/support-tickets/{ticketId}": {
			get: {
				tags: ["Support"],
				summary: "Get a support ticket (Admin, or who submitted it)",
				security: loggedIn,
				requestParams: { path: supportTicketParams },
				responses: {
					"200": ok("The support ticket", supportTicketSchema),
					"401": fail("Missing, invalid or expired access token"),
					"404": fail("Support ticket not found"),
				},
			},
		},
		"/support-tickets/{ticketId}/resolve": {
			post: {
				tags: ["Support"],
				summary: "Resolve with a response; the submitter is notified (Admin)",
				security: loggedIn,
				requestParams: { path: supportTicketParams },
				requestBody: json(resolveSupportTicketSchema),
				responses: {
					"200": ok("The resolved ticket", supportTicketSchema),
					"404": fail("Support ticket not found"),
					"409": fail("The ticket is already resolved"),
					"422": fail("The response is missing"),
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
