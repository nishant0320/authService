import crypto from "node:crypto";
import bcrypt from "bcrypt";

import { BCRYPT_SALT_ROUND } from "../../config/envConfig";
import redis from "../../config/redisConfig";

export type TwoFactorMethod = "TOTP" | "WHATSAPP" | "PASSKEY";
export type TwoFactorPurpose = "login" | "enable";

export type TwoFactorSession = {
  sessionId: string;
  userId: string;
  method: TwoFactorMethod;
  purpose: TwoFactorPurpose;
  codeHash?: string;
  challenge?: string;
  payload?: Record<string, any>;
  createdAt: string;
};

const TWO_FACTOR_SESSION_PREFIX = "2fa:session:";

export function generateNumericCode(length = 6): string {
  const max = 10 ** length;
  return crypto.randomInt(0, max).toString().padStart(length, "0");
}

export async function hashTwoFactorCode(code: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUND);
  return bcrypt.hash(code, salt);
}

export async function verifyTwoFactorCode(
  code: string,
  codeHash: string,
): Promise<boolean> {
  return bcrypt.compare(code, codeHash);
}

export async function storeTwoFactorSession(
  session: TwoFactorSession,
  ttlSeconds = 300,
): Promise<void> {
  await redis.setex(
    `${TWO_FACTOR_SESSION_PREFIX}${session.sessionId}`,
    ttlSeconds,
    JSON.stringify(session),
  );
}

export async function getTwoFactorSession(
  sessionId: string,
): Promise<TwoFactorSession | null> {
  const raw = await redis.get(`${TWO_FACTOR_SESSION_PREFIX}${sessionId}`);
  if (!raw) return null;
  return JSON.parse(raw) as TwoFactorSession;
}

export async function deleteTwoFactorSession(sessionId: string): Promise<void> {
  await redis.del(`${TWO_FACTOR_SESSION_PREFIX}${sessionId}`);
}

export function createTwoFactorSessionId(): string {
  return crypto.randomUUID();
}
