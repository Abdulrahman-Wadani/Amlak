import {
	createSupportTicketSchema,
	listSupportTicketsQuerySchema,
	resolveSupportTicketSchema,
} from "@amlak/shared";
import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { parse } from "../validation.ts";
import * as support from "./service.ts";

export const supportRouter = Router();

export const supportTicketParams = z.object({ ticketId: z.uuid() });

supportRouter.get("/support-tickets", requireAuth, async (req, res) => {
	const query = parse(listSupportTicketsQuerySchema, req.query);
	const page = parsePage(req.query);
	res.json(await support.listSupportTickets(currentUser(res), query, page));
});

supportRouter.post(
	"/support-tickets",
	requireAuth,
	requireRole("MANAGER", "WORKER"),
	async (req, res) => {
		const input = parse(createSupportTicketSchema, req.body);
		res
			.status(201)
			.json(await support.createSupportTicket(currentUser(res), input));
	},
);

supportRouter.get(
	"/support-tickets/:ticketId",
	requireAuth,
	async (req, res) => {
		const { ticketId } = parse(supportTicketParams, req.params);
		res.json(await support.getSupportTicket(currentUser(res), ticketId));
	},
);

supportRouter.post(
	"/support-tickets/:ticketId/resolve",
	requireAuth,
	requireRole("ADMIN"),
	async (req, res) => {
		const { ticketId } = parse(supportTicketParams, req.params);
		const input = parse(resolveSupportTicketSchema, req.body);
		res.json(
			await support.resolveSupportTicket(currentUser(res), ticketId, input),
		);
	},
);
