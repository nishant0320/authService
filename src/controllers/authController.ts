// import { Request, Response } from "express";

import { FastifyReply, FastifyRequest } from "fastify";

import AuthService from "../services/authService";
import asyncHandler from "../utils/common/asyncHandler";
import { UnauthorizedError } from "../utils/errors/error";
import { sendSuccess } from "../utils/common/response";
import { STATUS_CODES } from "../utils/common/constants";
import { LoginBody, RegisterBody } from "../types";
import cookieOption from "../utils/common/cookieOptions";
import { sendPasswordlessLoginEmail } from "../utils/helpers/email";
import { buildUrl } from "../utils/helpers/buildUrl";

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

type GoogleCallbackRequest = FastifyRequest<{
  Querystring: {
    code?: string;
    state?: string;
    error?: string;
  };
}>;

export const googleLogin = asyncHandler(
  async (_req: FastifyRequest, res: FastifyReply) => {
    const state = authService.generateOAuthState();
    const authUrl = authService.getGoogleAuthUrl(state);

    res.setCookie("oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 5 * 60 * 1000,
    });

    return res.redirect(authUrl);
  },
);

export const googleCallback = asyncHandler(
  async (req: GoogleCallbackRequest, res: FastifyReply) => {
    const { code, state, error } = req.query;

    if (error) {
      throw new UnauthorizedError("Google OAuth was denied.", { error });
    }

    if (!code || !state) {
      throw new UnauthorizedError("Missing Google OAuth callback parameters.");
    }

    const cookieState = req.cookies?.oauth_state;
    if (!cookieState || cookieState !== state) {
      throw new UnauthorizedError("Invalid OAuth state.");
    }

    res.clearCookie("oauth_state");

    const result = await authService.loginWithGoogleCode(code);
    res.setCookie("refreshToken", result.tokens.refreshToken, cookieOption("refresh"));

    return sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
      "Google login successful",
      STATUS_CODES.OK,
    );
  },
);

export const passless = asyncHandler(
  async (req: FastifyRequest<{ Body: { email: string } }>, res: FastifyReply) => {
    let { email, name, token, role } = await authService.passless(req.body.email);
    let link = buildUrl(req, {
      prefix: "/api/v1/auth",
      path: "/magic/verify",
      query: { token, role },
    });
    await sendPasswordlessLoginEmail(email, name ?? "User", 5, link);
    sendSuccess(res, link, "Passwordless login link successfully send", 200);
  },
);
export const testPassless = asyncHandler(
  async (req: FastifyRequest, res: FastifyReply) => {
    let { email, name, token, role } = await authService.testPassless();

    let link = buildUrl(req, {
      prefix: "/api/v1/auth",
      path: "/test/magic/verify",
      query: { token, role },
    });
    await sendPasswordlessLoginEmail(email, name ?? "User", 5, link);
    sendSuccess(res, link, "Test Passwordless login link successfully send", 200);
  },
);
export const passlessVerify = asyncHandler(
  async (
    req: FastifyRequest<{
      Querystring: {
        token: string;
        role: string;
      };
    }>,
    res: FastifyReply,
  ) => {
    let { token, role } = req.query;
    let response = await authService.passlessVerify(token, role);

    sendSuccess(res, response, "Welcome back", 200);
  },
);
export const testPasslessVerify = asyncHandler(
  async (
    req: FastifyRequest<{
      Querystring: {
        token: string;
        role: string;
      };
    }>,
    res: FastifyReply,
  ) => {
    let { token, role } = req.query;
    let response = await authService.testPasslessVerify(token, role);

    sendSuccess(res, response, "Test Welcome back", 200);
  },
);

export const register = asyncHandler(
  async (req: RegisterRequest, res: FastifyReply): Promise<any> => {
    // console.log(req)
    const result = await authService.register(req.body);

    res.setCookie("refreshToken", result.tokens.refreshToken, cookieOption("refresh"));

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
  const token =
    req.headers.authorization?.split(" ")[1] || req.cookies.refreshToken || "";
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
