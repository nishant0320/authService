import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/helpers/jwt";
import { UnauthorizedError } from "../utils/errors/error";
import asyncHandler from "../utils/common/asyncHandler";

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError(
        "Access denied. No token provided. Please log in.",
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new UnauthorizedError("Access denied. Malformed token.");
    }

    const decoded = await verifyAccessToken(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  },
);
