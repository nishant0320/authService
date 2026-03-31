import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { STATUS_CODES } from "./utils/common/constants";
import apiRouter from "./routes/apiRoutes";
import { sendError } from "./utils/common/response";

const app = express();

app.use(helmet());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(STATUS_CODES.OK).json({
    success: true,
    message: "hospital-mgmt-API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api", apiRouter);

app.use((_req, res) => {
  sendError(res, "Route not found", STATUS_CODES.NOT_FOUND);
});

export default app;
