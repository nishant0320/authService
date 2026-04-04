// // import cookieParser from "cookie-parser";
// // import express from "express";
// // import helmet from "helmet";
import { STATUS_CODES } from "./utils/common/constants";
import { NODE_ENV } from "./config/envConfig";
import apiRouter from "./routes/apiRoutes";
import { sendError } from "./utils/common/response";
import fastifyApp from "./config/serverConfig";
import { FastifyReply, FastifyRequest } from "fastify";
const app = fastifyApp;

app.get("/health", (req, res) => {
  res.status(STATUS_CODES.OK).send({
    success: true,
    message: "API is healthy and is running",
    timestamp: new Date().toLocaleString(),
    uptime: process.uptime(),
  });
});
app.get("/ping", (req, res) => {
  res.status(STATUS_CODES.OK).send("pong");
});

app.get("/date", (req: FastifyRequest, res: FastifyReply) => {
  res.code(200).send({ date: new Date().toLocaleDateString() });
});

app.register(apiRouter, { prefix: "/api" });

app.setNotFoundHandler((_req, res) => {
  sendError(res, "Route not found", STATUS_CODES.NOT_FOUND);
});

app.setErrorHandler((err: any, _req: FastifyRequest, res: FastifyReply) => {
  const statusCode = err?.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
  sendError(res, err?.message || "Something went wrong", statusCode, {
    name: err?.name,
    details: err?.details || {},
    ...(NODE_ENV === "development" ? { stack: err?.stack } : {}),
  });
});

export default app;
