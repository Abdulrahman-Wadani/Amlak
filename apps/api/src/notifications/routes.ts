import {
	announcementSchema,
	listNotificationsQuerySchema,
} from "@amlak/shared";
import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { parse } from "../validation.ts";
import * as notifications from "./service.ts";

export const notificationsRouter = Router();

export const notificationParams = z.object({ notificationId: z.uuid() });

notificationsRouter.get("/notifications", requireAuth, async (req, res) => {
	const query = parse(listNotificationsQuerySchema, req.query);
	const page = parsePage(req.query);
	res.json(
		await notifications.listNotifications(currentUser(res), query, page),
	);
});

notificationsRouter.post(
	"/notifications/:notificationId/read",
	requireAuth,
	async (req, res) => {
		const { notificationId } = parse(notificationParams, req.params);
		res.json(await notifications.markRead(currentUser(res), notificationId));
	},
);

notificationsRouter.post(
	"/notifications",
	requireAuth,
	requireRole("ADMIN"),
	async (req, res) => {
		const input = parse(announcementSchema, req.body);
		res
			.status(201)
			.json(await notifications.sendAnnouncement(currentUser(res), input));
	},
);
