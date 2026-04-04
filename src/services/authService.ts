import AuditLogRepository from "../repositories/auditLogRepository";
import UserRepository from "../repositories/userRepository";
import { JwtPayload, TokenPair } from "../types";
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors/error";
import { sendWelcomeEmail } from "../utils/helpers/email";
import {
  blacklistToken,
  generateTokenPair,
  getStoredRefreshToken,
  removeRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
} from "../utils/helpers/jwt";
import bcrypt from "bcrypt";
import { generateTotpSecret, verifyTotpToken } from "../utils/helpers/totp";
import logger from "../config/loggerConfig";

const userRepo = new UserRepository();
const auditLogRepo = new AuditLogRepository();

export default class AuthService {
  async register(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    gender: string;
  }): Promise<{ user: any; tokens: TokenPair }> {
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

    const {
      password: _,
      refreshToken: __,
      totpSecret: ___,
      ...safeUser
    } = user;

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
      if (
        !user.totpSecret ||
        !(await verifyTotpToken(totpToken, user.totpSecret))
      ) {
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
    await auditLogRepo.logAction({
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      userId: user.id,
    });

    const {
      password: _,
      refreshToken: __,
      totpSecret: ___,
      ...safeUser
    } = user;

    return { user: safeUser, tokens };
  }

  async logout(userId: string, accessToken: string): Promise<void> {
    await blacklistToken(accessToken);
    await removeRefreshToken(userId);
    await userRepo.updateRefreshToken(userId, null);
    await auditLogRepo.logAction({
      action: "LOGOUT",
      entity: "User",
      entityId: userId,
      userId,
    });
    logger.info(`User ${userId} logged out.`);
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const decoded = verifyRefreshToken(refreshToken);

    const storedToken = await getStoredRefreshToken(decoded.id);
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedError(
        "Refresh token is invalid or has been revoked.",
      );
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

  
}
