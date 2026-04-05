import { Request, Response } from "express";
import UserService from "../services/userService";
import asyncHandler  from "../utils/common/asyncHandler";
import { sendSuccess } from "../utils/common/response";
import { STATUS_CODES } from "../utils/common/constants";
import { parsePagination } from "../utils/common/pagination";

const userService = new UserService();

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getProfile(req.user!.id);

  sendSuccess(res, user, "Profile fetched", STATUS_CODES.OK);
});

export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await userService.updateProfile(req.user!.id, req.body);

    sendSuccess(res, user, "Profile updated", STATUS_CODES.OK);
  },
);

export const uploadAvatar = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await userService.uploadAvatar(
      req.user!.id,
      req.file!.buffer,
    );
    sendSuccess(res, result, "Avatar uploaded", STATUS_CODES.OK);
  },
);

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const params = parsePagination(req.query);
  const filters = {
    role: req.query.role as string,
    isActive:
      req.query.isActive !== undefined
        ? req.query.isActive === "true"
        : undefined,
  };
  const users = await userService.listUsers(params, filters);
  sendSuccess(res, users, "Users fetched", STATUS_CODES.OK);
});
