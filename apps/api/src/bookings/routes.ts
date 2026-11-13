import {
	cancelBookingSchema,
	createBookingSchema,
	listBookingsQuerySchema,
} from "@amlak/shared";
import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { placeParams } from "../places/routes.ts";
import { parse } from "../validation.ts";
import * as bookings from "./service.ts";
import { checkIn, checkOut } from "./stays.ts";

export const bookingsRouter = Router();

export const bookingParams = z.object({ bookingId: z.uuid() });
const managerOrWorker = [requireAuth, requireRole("MANAGER", "WORKER")];

bookingsRouter.get(
	"/places/:placeId/bookings",
	...managerOrWorker,
	async (req, res) => {
		const { placeId } = parse(placeParams, req.params);
		const query = parse(listBookingsQuerySchema, req.query);
		const page = parsePage(req.query);
		res.json(
			await bookings.listBookings(currentUser(res), placeId, query, page),
		);
	},
);

bookingsRouter.post(
	"/places/:placeId/bookings",
	...managerOrWorker,
	async (req, res) => {
		const { placeId } = parse(placeParams, req.params);
		const input = parse(createBookingSchema, req.body);
		const booking = await bookings.createBooking(
			currentUser(res),
			placeId,
			input,
			req.ip,
		);
		res.status(201).json(booking);
	},
);

bookingsRouter.get(
	"/bookings/:bookingId",
	...managerOrWorker,
	async (req, res) => {
		const { bookingId } = parse(bookingParams, req.params);
		res.json(await bookings.getBooking(currentUser(res), bookingId));
	},
);

bookingsRouter.post(
	"/bookings/:bookingId/cancel",
	...managerOrWorker,
	async (req, res) => {
		const { bookingId } = parse(bookingParams, req.params);
		const input = parse(cancelBookingSchema, req.body);
		res.json(
			await bookings.cancelBooking(currentUser(res), bookingId, input, req.ip),
		);
	},
);

bookingsRouter.post(
	"/bookings/:bookingId/check-in",
	...managerOrWorker,
	async (req, res) => {
		const { bookingId } = parse(bookingParams, req.params);
		res.json(await checkIn(currentUser(res), bookingId, req.ip));
	},
);

bookingsRouter.post(
	"/bookings/:bookingId/check-out",
	...managerOrWorker,
	async (req, res) => {
		const { bookingId } = parse(bookingParams, req.params);
		res.json(await checkOut(currentUser(res), bookingId, req.ip));
	},
);
