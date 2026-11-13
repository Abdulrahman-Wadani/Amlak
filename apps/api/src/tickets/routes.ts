import {
	approveTicketSchema,
	completeTicketSchema,
	createTicketSchema,
	listTicketsQuerySchema,
	reassignTicketSchema,
	rejectTicketSchema,
} from "@amlak/shared";
import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { placeParams } from "../places/routes.ts";
import { imageFiles, uploadedImages } from "../uploads/middleware.ts";
import { parse } from "../validation.ts";
import { completeTicket } from "./complete.ts";
import * as review from "./review.ts";
import * as tickets from "./service.ts";

export const ticketsRouter = Router();

export const ticketParams = z.object({ ticketId: z.uuid() });
const managerOrWorker = [requireAuth, requireRole("MANAGER", "WORKER")];
const managerOnly = [requireAuth, requireRole("MANAGER")];

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

ticketsRouter.post(
	"/tickets/:ticketId/approve",
	...managerOnly,
	async (req, res) => {
		const { ticketId } = parse(ticketParams, req.params);
		const input = parse(approveTicketSchema, req.body);
		res.json(
			await review.approveTicket(currentUser(res), ticketId, input, req.ip),
		);
	},
);

ticketsRouter.post(
	"/tickets/:ticketId/reject",
	...managerOnly,
	async (req, res) => {
		const { ticketId } = parse(ticketParams, req.params);
		const input = parse(rejectTicketSchema, req.body);
		res.json(
			await review.rejectTicket(currentUser(res), ticketId, input, req.ip),
		);
	},
);

ticketsRouter.post(
	"/tickets/:ticketId/reassign",
	...managerOnly,
	async (req, res) => {
		const { ticketId } = parse(ticketParams, req.params);
		const input = parse(reassignTicketSchema, req.body);
		res.json(
			await review.reassignTicket(currentUser(res), ticketId, input, req.ip),
		);
	},
);

ticketsRouter.post(
	"/tickets/:ticketId/complete",
	...managerOrWorker,
	imageFiles("photos", 5),
	async (req, res) => {
		const { ticketId } = parse(ticketParams, req.params);
		const input = parse(completeTicketSchema, req.body);
		const photos = uploadedImages(req);
		const ticket = await completeTicket(
			currentUser(res),
			ticketId,
			input,
			photos,
			req.ip,
		);
		res.json(ticket);
	},
);
