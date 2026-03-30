import { Response } from "express";

export function sendSuccess(
  res: Response,
  data: any,
  message: string,
  statusCode: number,
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message: String = "Error",
  statusCode: number = 500,
  errors?: any,
) {
  return res
    .status(statusCode)
    .json({ success: false, message, ...(errors && { errors }) });
}
