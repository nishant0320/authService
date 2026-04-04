import AuditLogRepository from "../repositories/auditLogRepository";
import UserRepository from "../repositories/userRepository";
import { JwtPayload, RegisterBody, testUser, TokenPair } from "../types";
import { ConflictError, NotFoundError, UnauthorizedError } from "../utils/errors/error";
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
import { verifyTotpToken } from "../utils/helpers/totp";
import logger from "../config/loggerConfig";
import { hash } from "../utils/helpers/hash";
import { sendError, sendSuccess } from "../utils/common/response";

const userRepo = new UserRepository();
const auditLogRepo = new AuditLogRepository();

export default class AuthService {
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
}

// let a = new AuthService();
// let { email, role, token, name } = await a.testPassless();
// console.table({ email, role, token, name });
// console.log(await a.testPasslessVerify(token, role));
