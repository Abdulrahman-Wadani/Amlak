import cookieParser from "cookie-parser";
import express from "express";
import { authRouter } from "./auth/routes.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { notFound } from "./middleware/not-found.ts";

export const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/v1", authRouter);

app.use(notFound);
app.use(errorHandler);
