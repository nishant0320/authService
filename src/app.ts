// // import cookieParser from "cookie-parser";
// // import express from "express";
// // import helmet from "helmet";
import { STATUS_CODES } from "./utils/common/constants";
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

// app.use((_req, res:FastifyReply) => {
//   sendError(res, "Route not found", STATUS_CODES.NOT_FOUND);
// });
app.setErrorHandler((err, req: FastifyRequest, res: FastifyReply) => {
  sendError(res, "Route not found", STATUS_CODES.NOT_FOUND, err);
});

export default app;
