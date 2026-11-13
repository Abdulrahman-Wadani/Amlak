import {
	createExpenseSchema,
	listExpensesQuerySchema,
	updateExpenseSchema,
} from "@amlak/shared";
import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth } from "../middleware/require-auth.ts";
import { requireRole } from "../middleware/require-role.ts";
import { parsePage } from "../pagination.ts";
import { placeParams } from "../places/routes.ts";
import { imageFiles, uploadedImages } from "../uploads/middleware.ts";
import { parse } from "../validation.ts";
import * as expenses from "./service.ts";

export const expensesRouter = Router();

export const expenseParams = z.object({ expenseId: z.uuid() });
const managerOnly = [requireAuth, requireRole("MANAGER")];

expensesRouter.get(
	"/places/:placeId/expenses",
	...managerOnly,
	async (req, res) => {
		const { placeId } = parse(placeParams, req.params);
		const query = parse(listExpensesQuerySchema, req.query);
		const page = parsePage(req.query);
		res.json(
			await expenses.listExpenses(currentUser(res), placeId, query, page),
		);
	},
);

expensesRouter.post(
	"/places/:placeId/expenses",
	...managerOnly,
	imageFiles("receipt", 1),
	async (req, res) => {
		const { placeId } = parse(placeParams, req.params);
		const input = parse(createExpenseSchema, req.body);
		const [receipt] = uploadedImages(req);
		const expense = await expenses.createExpense(
			currentUser(res),
			placeId,
			input,
			receipt,
			req.ip,
		);
		res.status(201).json(expense);
	},
);

expensesRouter.get("/expenses/:expenseId", ...managerOnly, async (req, res) => {
	const { expenseId } = parse(expenseParams, req.params);
	res.json(await expenses.getExpense(currentUser(res), expenseId));
});

expensesRouter.put(
	"/expenses/:expenseId",
	...managerOnly,
	imageFiles("receipt", 1),
	async (req, res) => {
		const { expenseId } = parse(expenseParams, req.params);
		const input = parse(updateExpenseSchema, req.body);
		const [receipt] = uploadedImages(req);
		const expense = await expenses.updateExpense(
			currentUser(res),
			expenseId,
			input,
			receipt,
			req.ip,
		);
		res.json(expense);
	},
);

expensesRouter.delete(
	"/expenses/:expenseId",
	...managerOnly,
	async (req, res) => {
		const { expenseId } = parse(expenseParams, req.params);
		await expenses.deleteExpense(currentUser(res), expenseId, req.ip);
		res.status(204).end();
	},
);
