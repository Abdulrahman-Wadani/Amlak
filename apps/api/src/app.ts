import cookieParser from "cookie-parser";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { assetsRouter } from "./assets/routes.ts";
import { authRouter } from "./auth/routes.ts";
import { bookingsRouter } from "./bookings/routes.ts";
import { dashboardRouter } from "./dashboard/routes.ts";
import { expensesRouter } from "./expenses/routes.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { notFound } from "./middleware/not-found.ts";
import { notificationsRouter } from "./notifications/routes.ts";
import { openApiDocument } from "./openapi.ts";
import { placeWorkersRouter } from "./place-workers/routes.ts";
import { placesRouter } from "./places/routes.ts";
import { reportsRouter } from "./reports/routes.ts";
import { schedulesRouter } from "./schedules/routes.ts";
import { ticketsRouter } from "./tickets/routes.ts";
import { usersRouter } from "./users/routes.ts";
import { workersRouter } from "./workers/routes.ts";

export const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/v1", authRouter);
app.use("/api/v1", usersRouter);
app.use("/api/v1", placesRouter);
app.use("/api/v1", assetsRouter);
app.use("/api/v1", workersRouter);
app.use("/api/v1", placeWorkersRouter);
app.use("/api/v1", ticketsRouter);
app.use("/api/v1", schedulesRouter);
app.use("/api/v1", bookingsRouter);
app.use("/api/v1", dashboardRouter);
app.use("/api/v1", expensesRouter);
app.use("/api/v1", reportsRouter);
app.use("/api/v1", notificationsRouter);

app.use(
	"/api/docs",
	swaggerUi.serve,
	swaggerUi.setup(openApiDocument, {
		swaggerOptions: { persistAuthorization: true },
	}),
);

app.use(notFound);
app.use(errorHandler);
