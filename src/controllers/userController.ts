import { Request, Response } from "express";
import UserService from "../services/userService";
import asyncHandler  from "../utils/common/asyncHandler";
import { sendSuccess } from "../utils/common/response";
import { STATUS_CODES } from "../utils/common/constants";

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
