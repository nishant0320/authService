import AuditLogRepository from "../repositories/auditLogRepository";
import UserRepository from "../repositories/userRepository";
import { JwtPayload, RegisterBody, testUser, TokenPair } from "../types";
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors/error";
import { sendEmail, sendWelcomeEmail } from "../utils/helpers/email";
import {
  blacklistToken,
  generateAccessToken,
  generateTokenPair,
  getStoredRefreshToken,
  removeRefreshToken,
  storeRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../utils/helpers/jwt";
import bcrypt from "bcrypt";
import {
  generateTotpQrCode,
  generateTotpSecret,
  verifyTotpToken,
} from "../utils/helpers/totp";
import logger from "../config/loggerConfig";
import { hash } from "../utils/helpers/hash";
import { sendError, sendSuccess } from "../utils/common/response";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} from "../config/envConfig";
import crypto from "node:crypto";

const userRepo = new UserRepository();
const auditLogRepo = new AuditLogRepository();

export default class AuthService {
  private assertGoogleConfig() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      throw new InternalServerError(
        "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.",
      );
    }
  }

  getGoogleAuthUrl(state: string) {
    this.assertGoogleConfig();
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "consent");
    return googleAuthUrl.toString();
  }

  generateOAuthState() {
    return crypto.randomBytes(16).toString("hex");
  }

  async loginWithGoogleCode(code: string): Promise<{ user: any; tokens: TokenPair }> {
    this.assertGoogleConfig();

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      throw new UnauthorizedError("Google token exchange failed.", { tokenErr });
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      throw new UnauthorizedError("Google did not return an access token.");
    }

    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    console.table(profileRes);

    if (!profileRes.ok) {
      const profileErr = await profileRes.text();
      throw new UnauthorizedError("Failed to fetch Google user profile.", { profileErr });
    }

    const profile = (await profileRes.json()) as {
      
      email?: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };

    if (!profile.email) {
      throw new UnauthorizedError("Google account email is missing.");
    }

    if (profile.email_verified === false) {
      throw new UnauthorizedError("Google email is not verified.");
    }

    let user = await userRepo.findByEmail(profile.email);

    if (!user) {
      const generatedPassword = await hash(crypto.randomUUID());
      user = await userRepo.create({
        name: profile.name || profile.email.split("@")[0],
        email: profile.email,
        password: generatedPassword,
        role: "USER",
        avatarUrl: profile.picture,
      });
    } else {
      user = await userRepo.update(user.id, {
        name: profile.name || user.name,
        avatarUrl: profile.picture || user.avatarUrl,
        lastLogin: new Date(),
      });
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const tokens = generateTokenPair(payload);

    await storeRefreshToken(user.id, tokens.refreshToken);
    await userRepo.updateRefreshToken(user.id, tokens.refreshToken);

    const { password: _, refreshToken: __, totpSecret: ___, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  async register(data: RegisterBody): Promise<{ user: any; tokens: TokenPair }> {
    const existing = await userRepo.findByEmail(data.email);
    if (existing) {
      throw new ConflictError("A user with this email already exists.");
    }

    const user = await userRepo.create({
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
      gender: data.gender,
    });

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const tokens = generateTokenPair(payload);

    await storeRefreshToken(user.id, tokens.refreshToken);
    await userRepo.updateRefreshToken(user.id, tokens.refreshToken);

    sendWelcomeEmail(user.email, user.name).catch(() => {});

    await auditLogRepo.logAction({
      action: "REGISTER",
      entity: "User",
      entityId: user.id,
      userId: user.id,
    });

    const { password: _, refreshToken: __, totpSecret: ___, ...safeUser } = user;

    return { user: safeUser, tokens };
  }

  async login(
    email: string,
    password: string,
    totpToken?: string,
  ): Promise<{ user: any; tokens: TokenPair; requireTotp?: boolean }> {
    const user = await userRepo.findByEmail(email);
    if (!user) throw new UnauthorizedError("Invalid email or password.");
    if (!user.isActive) {
      throw new UnauthorizedError("Account is deactivated. Contact admin.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedError("Invalid email or password.");

    if (user.isTotpEnabled) {
      if (!totpToken) {
        return {
          user: { id: user.id },
          tokens: { accessToken: "", refreshToken: "" },
          requireTotp: true,
        };
      }
      if (!user.totpSecret || !verifyTotpToken(totpToken, user.totpSecret)) {
        throw new UnauthorizedError("Invalid TOTP token.");
      }
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const tokens = generateTokenPair(payload);

    await storeRefreshToken(user.id, tokens.refreshToken);
    await userRepo.updateRefreshToken(user.id, tokens.refreshToken);
    await userRepo.updateLastLogin(user.id);

    const { password: _, refreshToken: __, totpSecret: ___, ...safeUser } = user;

    return { user: safeUser, tokens };
  }

  async logout(userId: string, accessToken: string): Promise<void> {
    await blacklistToken(accessToken);
    await removeRefreshToken(userId);
    await userRepo.updateRefreshToken(userId, null);
    logger.info(`User ${userId} logged out.`);
  }

  async passless(
    email: string,
  ): Promise<{ email: string; name?: string; token: string; role: string }> {
    let user = await userRepo.findByEmail(email);
    if (!user) throw new NotFoundError("User not found with this email");
    let accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    let role = await hash(user.role);
    return { email: user?.email, name: user?.name ?? "user", token: accessToken, role };
  }

  async testPassless(): Promise<{
    email: string;
    name?: string;
    token: string;
    role: string;
  }> {
    let user = testUser;
    let accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    let role = await hash(user.role);
    return { email: user?.email, name: user?.name ?? "User", token: accessToken, role };
  }

  async passlessVerify(token: string, userRole: string): Promise<boolean> {
    let { id, email, role } = await verifyAccessToken(token);
    let tamperedRole = await bcrypt.compare(role, userRole);
    if (!tamperedRole) throw new UnauthorizedError("Url is tampered");
    let user = await userRepo.findByEmail(email);
    if (!user) throw new NotFoundError("User not found with this email");
    let validRole = bcrypt.compare(user.role, userRole);
    let verified = user.id === id && user.email === email && validRole;
    return verified;
  }

  async testPasslessVerify(token: string, userRole: string): Promise<boolean> {
    let decoded = await verifyAccessToken(token);

    if (!decoded) throw new UnauthorizedError("Invalid or expired tokens");
    let { email, id, role } = decoded;
    console.log(role, userRole);

    let user = testUser;
    let tamperedRole = await bcrypt.compare(role, userRole);
    if (!tamperedRole) throw new UnauthorizedError("Tampered Role", { tamperedRole });
    let validRole = bcrypt.compare(user.role, userRole);
    let verified = user.id === id && user.email === email && validRole;
    return verified;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const decoded = verifyRefreshToken(refreshToken);

    const storedToken = await getStoredRefreshToken(decoded.id);
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedError("Refresh token is invalid or has been revoked.");
    }

    const user = await userRepo.findById(decoded.id);
    if (!user.isActive) throw new UnauthorizedError("Account is deactivated");

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const tokens = generateTokenPair(payload);

    await storeRefreshToken(user.id, tokens.refreshToken);
    await userRepo.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    accessToken: string,
  ): Promise<void> {
    const user = await userRepo.findById(userId);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new ValidationError("Current password is incorrect");

    await userRepo.update(userId, { password: newPassword });

    await blacklistToken(accessToken);
    await removeRefreshToken(userId);
    await userRepo.updateRefreshToken(userId, null);

    await auditLogRepo.logAction({
      action: "CHANGE_PASSWORD",
      entity: "User",
      entityId: userId,
      userId,
    });
  }

  async enableTotp(
    userId: string,
    password: string,
  ): Promise<{ secret: string; qrCode: string }> {
    const user = await userRepo.findById(userId);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new ValidationError("Password is incorrect");

    if (user.isTotpEnabled) throw new ConflictError("TOTP is already enabled");

    const secret = generateTotpSecret();
    const qrCode = await generateTotpQrCode(user.email, secret);

    await userRepo.updateTotpSecret(userId, secret, false);

    return { secret, qrCode };
  }

  async verifyAndActivateTotp(userId: string, token: string): Promise<void> {
    const user = await userRepo.findById(userId);

    if (!user.totpSecret) {
      throw new NotFoundError("No TOTP secret found. Call enable first.");
    }

    if (user.isTotpEnabled) {
      throw new ConflictError("TOTP is already active.");
    }

    const isValid = await verifyTotpToken(token, user.totpSecret);
    if (!isValid) {
      throw new ValidationError("Invalid TOTP token. Please try again.");
    }

    await userRepo.updateTotpSecret(userId, user.totpSecret, true);

    await auditLogRepo.logAction({
      action: "ENABLE_TOTP",
      entity: "User",
      entityId: userId,
      userId,
    });
  }

  async disableTotp(userId: string, password: string): Promise<void> {
    const user = await userRepo.findById(userId);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ValidationError("Password is incorrect.");
    }

    await userRepo.updateTotpSecret(userId, null, false);

    await auditLogRepo.logAction({
      action: "DISABLE_TOTP",
      entity: "User",
      entityId: userId,
      userId,
    });
  }
}
