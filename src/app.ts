// // import cookieParser from "cookie-parser";
// // import express from "express";
// // import helmet from "helmet";
import { STATUS_CODES } from "./utils/common/constants";
import apiRouter from "./routes/apiRoutes";
import { sendError } from "./utils/common/response";
import fastifyApp from "./config/serverConfig";
const app = fastifyApp;

app.get("/health", (_req, res) => {
  res.status(STATUS_CODES.OK).send({
    success: true,
    message: "API is healthy and is running",
    timestamp: new Date().toLocaleString(),
    uptime: process.uptime(),
  });
});

app.register(apiRouter, { prefix: "/api" });

// app.use((_req, res) => {
//   sendError(res, "Route not found", STATUS_CODES.NOT_FOUND);
// });
app.setErrorHandler((err, req, res) => {
  sendError(res, "Route not found", STATUS_CODES.NOT_FOUND, err);
});

export default app;
