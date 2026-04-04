import { Request, Response } from "express";
import AuthService from "../services/authService";
import asyncHandler from "../utils/common/asyncHandler";
import { sendSuccess } from "../utils/common/response";
import { STATUS_CODES } from "../utils/common/constants";

const authService = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  // console.log(req)
  const result = await authService.register(req.body);

  res.cookie("refreshToken", result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendSuccess(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
    "Registration successful",
    STATUS_CODES.CREATED,
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, totpToken } = req.body;
  const result = await authService.login(email, password, totpToken);

  if (result.requireTotp) {
    sendSuccess(
      res,
      { requireTotp: true, userId: result.user.id },
      "TOTP required",
      STATUS_CODES.OK,
    );
    return;
  }

  res.cookie("refreshToken", result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendSuccess(
    res,
    { user: result.user, accessToken: result.tokens.accessToken },
    "Login successful",
    STATUS_CODES.OK,
  );
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1] || "";
  await authService.logout(req.user!.id, token);

  res.clearCookie("refreshToken");
  sendSuccess(res, null, "Logout successful", STATUS_CODES.OK);
});

export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    const tokens = await authService.refreshTokens(token);

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(
      res,
      { accessToken: tokens.accessToken },
      "Token refreshed",
      STATUS_CODES.OK,
    );
  },
);

export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1] || "";
    await authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword,
      token,
    );
    res.clearCookie("refreshToken");
    sendSuccess(res, null, "Password changed successfully", STATUS_CODES.OK);
  },
);

export const enableTotp = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.enableTotp(req.user!.id, req.body.password);
  sendSuccess(
    res,
    result,
    "TOTP setup initiated. Scan QR code and verify.",
    STATUS_CODES.OK,
  );
});

export const verifyTotp = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyAndActivateTotp(req.user!.id, req.body.token);
  sendSuccess(res, null, "TOTP enabled successfully", STATUS_CODES.OK);
});

export const disableTotp = asyncHandler(async (req: Request, res: Response) => {
  await authService.disableTotp(req.user!.id, req.body.password);
  sendSuccess(res, null, "TOTP disabled successfully", STATUS_CODES.OK);
});
