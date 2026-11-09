import { createTicketSchema, listTicketsQuerySchema } from "@amlak/shared";
import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { placeParams } from "../places/routes.ts";
import { imageFiles, uploadedImages } from "../uploads/middleware.ts";
import { parse } from "../validation.ts";
import * as tickets from "./service.ts";

export const ticketsRouter = Router();

export const ticketParams = z.object({ ticketId: z.uuid() });
const managerOrWorker = [requireAuth, requireRole("MANAGER", "WORKER")];

ticketsRouter.post(
	"/places/:placeId/tickets",
	...managerOrWorker,
	imageFiles("photos", 5),
	async (req, res) => {
		const { placeId } = parse(placeParams, req.params);
		const input = parse(createTicketSchema, req.body);
		const photos = uploadedImages(req);
		const ticket = await tickets.createTicket(
			currentUser(res),
			placeId,
			input,
			photos,
			req.ip,
		);
		res.status(201).json(ticket);
	},
);

ticketsRouter.get("/tickets", ...managerOrWorker, async (req, res) => {
	const query = parse(listTicketsQuerySchema, req.query);
	const page = parsePage(req.query);
	res.json(await tickets.listTickets(currentUser(res), query, page));
});

ticketsRouter.get(
	"/tickets/:ticketId",
	...managerOrWorker,
	async (req, res) => {
		const { ticketId } = parse(ticketParams, req.params);
		res.json(await tickets.getTicket(currentUser(res), ticketId));
	},
);
