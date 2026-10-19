import express from "express";
import { errorHandler } from "./middleware/error-handler.ts";
import { notFound } from "./middleware/not-found.ts";

export const app = express();

app.use(express.json());

app.use(notFound);
app.use(errorHandler);
