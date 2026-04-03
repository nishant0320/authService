// import { Response } from "express";

import { FastifyReply } from "fastify";

export function sendSuccess(
  res: FastifyReply,
  data: any,
  message: string,
  statusCode: number,
) {
  return res.code(statusCode).send({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: FastifyReply,
  message: String = "Error",
  statusCode: number = 500,
  errors?: any,
) {
  return res
    .code(statusCode)
    .send({ success: false, message, ...(errors && { errors }) });
}
