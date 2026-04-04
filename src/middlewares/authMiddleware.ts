// import { Request, Response, NextFunction } from "express";

import { FastifyReply, FastifyRequest } from "fastify";

import { verifyAccessToken } from "../utils/helpers/jwt";
import { UnauthorizedError } from "../utils/errors/error";
import asyncHandler from "../utils/common/asyncHandler";

export const authenticate = asyncHandler(
  async (req: FastifyRequest, res: FastifyReply) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Access denied. No token provided. Please log in.");
    }

    const token = authHeader.split(" ")[1] || req.cookies.refreshToken;

    if (!token) {
      throw new UnauthorizedError("Access denied. Malformed token.");
    }

    const decoded = await verifyAccessToken(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
  },
);
