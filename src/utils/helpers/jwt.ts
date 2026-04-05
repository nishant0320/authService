import redis from "../../config/redisConfig";
import {
  JWT_ACCESS_EXPIRY,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_EXPIRY,
  JWT_REFRESH_SECRET,
} from "../../config/envConfig";
import { JwtPayload, TokenPair } from "../../types";
import jwt, { Secret } from "jsonwebtoken";
import {
  JWT_BLACKLIST_PREFIX,
  REFRESH_TOKEN_PREFIX,
} from "../common/constants";
import { UnauthorizedError } from "../errors/error";

export function generateTokenPair(payload: JwtPayload): TokenPair {
  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY as Secret,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(
    payload,
    JWT_REFRESH_SECRET as Secret,
    {
      expiresIn: JWT_REFRESH_EXPIRY,
    } as jwt.SignOptions,
  );

  return { accessToken, refreshToken };
}

export async function storeRefreshToken(
  userId: string,
  refreshToken: string,
  ttlSeconds: number = 7 * 24 * 60 * 60,
): Promise<void> {
  await redis.setex(
    `${REFRESH_TOKEN_PREFIX}${userId}`,
    ttlSeconds,
    refreshToken,
  );
}

export async function blacklistToken(token: string): Promise<void> {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload | null;
    if (!decoded?.exp) return;

    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redis.setex(`${JWT_BLACKLIST_PREFIX}${token}`, ttl, "1");
    }
  } catch {}
}

export async function removeRefreshToken(userId: string): Promise<void> {
  await redis.del(`${REFRESH_TOKEN_PREFIX}${userId}`);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  try {
    const isBlacklisted = await redis.get(`${JWT_BLACKLIST_PREFIX}${token}`);
    if (isBlacklisted) throw new UnauthorizedError("Token has been revoked");

    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError("Invalid or expired access token");
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  } catch (error) {
    throw new UnauthorizedError("Invalid or expired refresh token.");
  }
}

export async function getStoredRefreshToken(
  userId: string,
): Promise<string | null> {
  return redis.get(`${REFRESH_TOKEN_PREFIX}${userId}`);
}
