// import { Request, Response } from "express";

import { FastifyReply, FastifyRequest } from "fastify";

import AuthService from "../services/authService";
import asyncHandler from "../utils/common/asyncHandler";
import { sendSuccess } from "../utils/common/response";
import { STATUS_CODES } from "../utils/common/constants";
import { LoginBody, RegisterBody } from "../types";
import cookieOption from "../utils/common/cookieOptions";

const authService = new AuthService();

type RegisterRequest = FastifyRequest<{
  Body: RegisterBody;
}>;
type LoginRequest = FastifyRequest<{
  Body: LoginBody;
}>;
type RefreshTokenRequest = FastifyRequest<{
  Body: { refreshToken: string };
}>;

export const register = asyncHandler(
  async (req: RegisterRequest, res: FastifyReply): Promise<any> => {
    // console.log(req)
    const result = await authService.register(req.body);

    res.setCookie("refreshToken", result.tokens.refreshToken, {
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
  },
);

export const login = asyncHandler(async (req: LoginRequest, res: FastifyReply) => {
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

  res.cookie("refreshToken", result.tokens.refreshToken, cookieOption("refresh"));

  sendSuccess(
    res,
    { user: result.user, accessToken: result.tokens.accessToken },
    "Login successful",
    STATUS_CODES.OK,
  );
});

export const logout = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const token = req.headers.authorization?.split(" ")[1] || "";
  await authService.logout(req.user!.id, token);

  res.clearCookie("refreshToken");
  sendSuccess(res, null, "Logout successful", STATUS_CODES.OK);
});

export const refreshToken = asyncHandler(
  async (req: RefreshTokenRequest, res: FastifyReply) => {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    const tokens = await authService.refreshTokens(token as string);

    res.cookie("refreshToken", tokens.refreshToken, cookieOption("refresh"));

    sendSuccess(
      res,
      { accessToken: tokens.accessToken },
      "Token refreshed",
      STATUS_CODES.OK,
    );
  },
);
