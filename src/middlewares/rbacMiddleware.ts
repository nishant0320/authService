import { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/errors/error";
import { Role } from "../utils/common/constants";

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError(
        "Authentication required before authorization.",
      );
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      throw new ForbiddenError(
        `Access denied. Required role(s): ${allowedRoles.join(", ")}. Your role: ${req.user.role}.`,
      );
    }

    next();
  };
}