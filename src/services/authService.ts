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
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_REDIRECT_URI,
  WEBAUTHN_RP_ID,
  WEBAUTHN_RP_ORIGIN,
} from "../config/envConfig";
import PasskeyRepository from "../repositories/passkeyRepository";
import {
  createTwoFactorSessionId,
  deleteTwoFactorSession,
  generateNumericCode,
  getTwoFactorSession,
  hashTwoFactorCode,
  storeTwoFactorSession,
  verifyTwoFactorCode,
} from "../utils/helpers/twoFactor";
import {
  isWhatsAppConfigured,
  sendWhatsAppVerificationCode,
} from "../utils/helpers/whatsapp";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import crypto from "node:crypto";

const userRepo = new UserRepository();
const auditLogRepo = new AuditLogRepository();
const passkeyRepo = new PasskeyRepository();

export default class AuthService {
  private buildSafeUser(user: any) {
    const { password: _, refreshToken: __, totpSecret: ___, ...safeUser } = user;
    return safeUser;
  }

  private async issueTokens(user: any) {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const tokens = generateTokenPair(payload);

    await storeRefreshToken(user.id, tokens.refreshToken);
    await userRepo.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.buildSafeUser(user),
      tokens,
    };
  }

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

  private assertWebAuthnConfig() {
    if (!WEBAUTHN_RP_ID || !WEBAUTHN_RP_ORIGIN) {
      throw new InternalServerError(
        "WebAuthn is not configured. Set WEBAUTHN_RP_ID and WEBAUTHN_RP_ORIGIN.",
      );
    }
  }

  private async createTwoFactorLoginSession(params: {
    userId: string;
    method: "TOTP" | "WHATSAPP" | "PASSKEY";
    purpose: "login" | "enable";
    codeHash?: string;
    challenge?: string;
    payload?: Record<string, any>;
  }) {
    const sessionId = createTwoFactorSessionId();
    await storeTwoFactorSession({
      sessionId,
      userId: params.userId,
      method: params.method,
      purpose: params.purpose,
      codeHash: params.codeHash,
      challenge: params.challenge,
      payload: params.payload,
      createdAt: new Date().toISOString(),
    });
    return sessionId;
  }

  private async completePasswordLogin(user: any) {
    const { user: safeUser, tokens } = await this.issueTokens(user);
    await userRepo.updateLastLogin(user.id);
    return { user: safeUser, tokens };
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

  private assertGithubConfig() {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_REDIRECT_URI) {
      throw new InternalServerError(
        "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_REDIRECT_URI.",
      );
    }
  }

  getGithubAuthUrl(state: string) {
    this.assertGithubConfig();
    const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
    githubAuthUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
    githubAuthUrl.searchParams.set("redirect_uri", GITHUB_REDIRECT_URI);
    githubAuthUrl.searchParams.set("scope", "user:email");
    githubAuthUrl.searchParams.set("state", state);
    return githubAuthUrl.toString();
  }

  async loginWithGithubCode(code: string): Promise<{ user: any; tokens: TokenPair }> {
    this.assertGithubConfig();

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      throw new UnauthorizedError("GitHub token exchange failed.", { tokenErr });
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      throw new UnauthorizedError("GitHub did not return an access token.");
    }

    const profileRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!profileRes.ok) {
      const profileErr = await profileRes.text();
      throw new UnauthorizedError("Failed to fetch GitHub user profile.", { profileErr });
    }

    const profile = (await profileRes.json()) as {
      login?: string;
      id?: number;
      email?: string;
      name?: string;
      avatar_url?: string;
    };

    if (!profile.email) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (emailRes.ok) {
        const emails = (await emailRes.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        if (!primaryEmail?.email) {
          throw new UnauthorizedError("No verified email found in GitHub account.");
        }
        profile.email = primaryEmail.email;
      } else {
        throw new UnauthorizedError(
          "GitHub account email is missing and could not be fetched.",
        );
      }
    }

    let user = await userRepo.findByEmail(profile.email);

    if (!user) {
      const generatedPassword = await hash(crypto.randomUUID());
      user = await userRepo.create({
        name: profile.name || profile.login || profile.email.split("@")[0],
        email: profile.email,
        password: generatedPassword,
        role: "USER",
        avatarUrl: profile.avatar_url,
      });
    } else {
      user = await userRepo.update(user.id, {
        name: profile.name || user.name,
        avatarUrl: profile.avatar_url || user.avatarUrl,
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
  ): Promise<
    | { user: any; tokens: TokenPair }
    | { user: { id: string }; tokens: TokenPair; requireTotp: true }
    | {
        user: { id: string };
        tokens: TokenPair;
        require2fa: {
          method: "WHATSAPP" | "PASSKEY";
          sessionId: string;
          options?: any;
          destination?: string;
        };
      }
  > {
    const user = await userRepo.findByEmail(email);
    if (!user) throw new UnauthorizedError("Invalid email or password.");
    if (!user.isActive) {
      throw new UnauthorizedError("Account is deactivated. Contact admin.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedError("Invalid email or password.");

    const activeTwoFactor =
      user.twoFactorMethod || (user.isTotpEnabled ? "TOTP" : "NONE");

    if (activeTwoFactor === "TOTP") {
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

    if (activeTwoFactor === "WHATSAPP") {
      if (!user.phone) {
        throw new ValidationError("A phone number is required for WhatsApp 2FA.");
      }

      const code = generateNumericCode();
      const codeHash = await hashTwoFactorCode(code);
      const sessionId = await this.createTwoFactorLoginSession({
        userId: user.id,
        method: "WHATSAPP",
        purpose: "login",
        codeHash,
      });

      await sendWhatsAppVerificationCode(user.phone, code, user.name);

      return {
        user: { id: user.id },
        tokens: { accessToken: "", refreshToken: "" },
        require2fa: {
          method: "WHATSAPP",
          sessionId,
          destination: user.phone,
        },
      };
    }

    if (activeTwoFactor === "PASSKEY") {
      const credentials = await passkeyRepo.findByUserId(user.id);
      if (!credentials.length) {
        throw new NotFoundError("No passkey credentials found for this account.");
      }

      this.assertWebAuthnConfig();
      const options = await generateAuthenticationOptions({
        rpID: WEBAUTHN_RP_ID,
        userVerification: "preferred",
        allowCredentials: credentials.map((credential) => ({
          id: credential.credentialId,
          type: "public-key" as const,
          transports: credential.transports
            ? (credential.transports.split(",") as any)
            : undefined,
        })),
      });

      const sessionId = await this.createTwoFactorLoginSession({
        userId: user.id,
        method: "PASSKEY",
        purpose: "login",
        challenge: options.challenge,
        payload: { options },
      });

      return {
        user: { id: user.id },
        tokens: { accessToken: "", refreshToken: "" },
        require2fa: {
          method: "PASSKEY",
          sessionId,
          options,
        },
      };
    }

    return this.completePasswordLogin(user);
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

    await userRepo.update(userId, {
      totpSecret: secret,
      isTotpEnabled: false,
      isWhatsappEnabled: false,
      twoFactorMethod: "TOTP",
    });

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

    await userRepo.update(userId, {
      isTotpEnabled: true,
      isWhatsappEnabled: false,
      twoFactorMethod: "TOTP",
    });

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

    await userRepo.update(userId, {
      totpSecret: null,
      isTotpEnabled: false,
      twoFactorMethod: user.twoFactorMethod === "TOTP" ? "NONE" : user.twoFactorMethod,
    });

    await auditLogRepo.logAction({
      action: "DISABLE_TOTP",
      entity: "User",
      entityId: userId,
      userId,
    });
  }

  async enableWhatsappTwoFactor(
    userId: string,
    password: string,
  ): Promise<{ sessionId: string; destination: string }> {
    const user = await userRepo.findById(userId);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new ValidationError("Password is incorrect");

    if (!user.phone)
      throw new ValidationError("Add a phone number before enabling WhatsApp 2FA.");
    if (!isWhatsAppConfigured()) {
      throw new InternalServerError(
        "WhatsApp messaging is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
      );
    }

    const code = generateNumericCode();
    const codeHash = await hashTwoFactorCode(code);
    const sessionId = await this.createTwoFactorLoginSession({
      userId,
      method: "WHATSAPP",
      purpose: "enable",
      codeHash,
    });

    await sendWhatsAppVerificationCode(user.phone, code, user.name);
    return { sessionId, destination: user.phone };
  }

  async verifyWhatsappTwoFactor(
    userId: string,
    sessionId: string,
    code: string,
  ): Promise<void> {
    const session = await getTwoFactorSession(sessionId);
    if (!session || session.userId !== userId || session.method !== "WHATSAPP") {
      throw new UnauthorizedError("Invalid or expired WhatsApp verification session.");
    }

    if (!session.codeHash || !(await verifyTwoFactorCode(code, session.codeHash))) {
      throw new UnauthorizedError("Invalid WhatsApp verification code.");
    }

    await deleteTwoFactorSession(sessionId);
    await userRepo.update(userId, {
      isWhatsappEnabled: true,
      isTotpEnabled: false,
      twoFactorMethod: "WHATSAPP",
    });

    await auditLogRepo.logAction({
      action: "ENABLE_WHATSAPP_2FA",
      entity: "User",
      entityId: userId,
      userId,
    });
  }

  async disableWhatsappTwoFactor(userId: string, password: string): Promise<void> {
    const user = await userRepo.findById(userId);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new ValidationError("Password is incorrect.");

    await userRepo.update(userId, {
      isWhatsappEnabled: false,
      twoFactorMethod:
        user.twoFactorMethod === "WHATSAPP" ? "NONE" : user.twoFactorMethod,
    });

    await auditLogRepo.logAction({
      action: "DISABLE_WHATSAPP_2FA",
      entity: "User",
      entityId: userId,
      userId,
    });
  }

  async verifyWhatsappLogin(
    sessionId: string,
    code: string,
  ): Promise<{ user: any; tokens: TokenPair }> {
    const session = await getTwoFactorSession(sessionId);
    if (!session || session.method !== "WHATSAPP" || session.purpose !== "login") {
      throw new UnauthorizedError("Invalid or expired WhatsApp login session.");
    }

    if (!session.codeHash || !(await verifyTwoFactorCode(code, session.codeHash))) {
      throw new UnauthorizedError("Invalid WhatsApp verification code.");
    }

    const user = await userRepo.findById(session.userId);
    await deleteTwoFactorSession(sessionId);
    return this.completePasswordLogin(user);
  }

  async beginPasskeyRegistration(
    userId: string,
  ): Promise<{ sessionId: string; options: any }> {
    this.assertWebAuthnConfig();
    const user = await userRepo.findById(userId);
    const existingCredentials = await passkeyRepo.findByUserId(userId);

    const options = await generateRegistrationOptions({
      rpName: "AuthService",
      rpID: WEBAUTHN_RP_ID,
      userID: user.id,
      userName: user.email,
      userDisplayName: user.name,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      excludeCredentials: existingCredentials.map((credential) => ({
        id: credential.credentialId,
        type: "public-key",
        transports: credential.transports
          ? (credential.transports.split(",") as any)
          : undefined,
      })),
    });

    const sessionId = await this.createTwoFactorLoginSession({
      userId,
      method: "PASSKEY",
      purpose: "enable",
      challenge: options.challenge,
      payload: { options },
    });

    return { sessionId, options };
  }

  async verifyPasskeyRegistration(
    userId: string,
    sessionId: string,
    response: any,
  ): Promise<void> {
    this.assertWebAuthnConfig();
    const session = await getTwoFactorSession(sessionId);
    if (!session || session.userId !== userId || session.method !== "PASSKEY") {
      throw new UnauthorizedError("Invalid or expired passkey registration session.");
    }
    if (!session.challenge) {
      throw new UnauthorizedError("Missing passkey registration challenge.");
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: session.challenge,
      expectedOrigin: WEBAUTHN_RP_ORIGIN,
      expectedRPID: WEBAUTHN_RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedError("Passkey registration failed.");
    }

    const { credential } = verification.registrationInfo;

    await passkeyRepo.create({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: response?.response?.transports?.join(",") ?? null,
    });

    await deleteTwoFactorSession(sessionId);
    await userRepo.update(userId, {
      isTotpEnabled: false,
      isWhatsappEnabled: false,
      twoFactorMethod: "PASSKEY",
    });

    await auditLogRepo.logAction({
      action: "ENABLE_PASSKEY",
      entity: "User",
      entityId: userId,
      userId,
    });
  }

  async verifyPasskeyLogin(
    sessionId: string,
    response: any,
  ): Promise<{ user: any; tokens: TokenPair }> {
    this.assertWebAuthnConfig();
    const session = await getTwoFactorSession(sessionId);
    if (!session || session.method !== "PASSKEY" || session.purpose !== "login") {
      throw new UnauthorizedError("Invalid or expired passkey login session.");
    }
    if (!session.challenge) {
      throw new UnauthorizedError("Missing passkey login challenge.");
    }

    const credentialId = response?.id;
    if (!credentialId) {
      throw new ValidationError("Passkey credential ID is required.");
    }

    const credential = await passkeyRepo.findByCredentialId(credentialId);
    if (!credential || credential.userId !== session.userId) {
      throw new UnauthorizedError("Passkey credential not found for this user.");
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: session.challenge,
      expectedOrigin: WEBAUTHN_RP_ORIGIN,
      expectedRPID: WEBAUTHN_RP_ID,
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, "base64url"),
        counter: credential.counter,
        transports: credential.transports
          ? (credential.transports.split(",") as any)
          : undefined,
      },
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.authenticationInfo) {
      throw new UnauthorizedError("Passkey verification failed.");
    }

    await passkeyRepo.update(credential.id, {
      counter: verification.authenticationInfo.newCounter,
    });

    const user = await userRepo.findById(session.userId);
    await deleteTwoFactorSession(sessionId);
    return this.completePasswordLogin(user);
  }

  async disablePasskey(userId: string): Promise<void> {
    await passkeyRepo.deleteByUserId(userId);
    const user = await userRepo.findById(userId);
    await userRepo.update(userId, {
      twoFactorMethod: user.twoFactorMethod === "PASSKEY" ? "NONE" : user.twoFactorMethod,
    });

    await auditLogRepo.logAction({
      action: "DISABLE_PASSKEY",
      entity: "User",
      entityId: userId,
      userId,
    });
  }

  async logout(userId: string, accessToken: string): Promise<void> {
    await blacklistToken(accessToken);
    await removeRefreshToken(userId);
    await userRepo.updateRefreshToken(userId, null);
    logger.info(`User ${userId} logged out.`);
  }

  async passless(
    email: string,
  ): Promise<{ email: string; name?: string; token: string }> {
    let user = await userRepo.findByEmail(email);
    if (!user) throw new NotFoundError("User not found with this email");
    let accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return { email: user?.email, name: user?.name ?? "user", token: accessToken };
  }

  async testPassless(): Promise<{
    email: string;
    name?: string;
    token: string;
  }> {
    let user = testUser;
    let accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return { email: user?.email, name: user?.name ?? "User", token: accessToken };
  }

  async passlessVerify(token: string) {
    let { id, email, role } = await verifyAccessToken(token);
    let user = await userRepo.findByEmail(email);
    if (!user) throw new NotFoundError("User not found with this email");
    if (user.id !== id) throw new UnauthorizedError("Token user ID mismatch");
    if (user.role !== role) throw new UnauthorizedError("Token role mismatch");

    // Generate session tokens
    const tokens = generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async testPasslessVerify(token: string) {
    let decoded = await verifyAccessToken(token);

    if (!decoded) throw new UnauthorizedError("Invalid or expired tokens");
    let { email, id, role } = decoded;

    let user = testUser;
    if (user.id !== id) throw new UnauthorizedError("Token user ID mismatch");
    if (user.email !== email) throw new UnauthorizedError("Token email mismatch");
    if (user.role !== role) throw new UnauthorizedError("Token role mismatch");

    // Generate session tokens
    const tokens = generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
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
}
