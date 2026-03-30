import jwt from "jsonwebtoken";
import {
  JWT_ACCESS_EXPIRY,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_EXPIRY,
  JWT_REFRESH_SECRET,
} from "../../config/serverConfig";
import { JwtPayload, TokenPair } from "../../types";
import redis from "../../config/redisConfig";
import { REFRESH_TOKEN_PREFIX } from "../common/constants";

export function generateTokenPair(payload: JwtPayload): TokenPair {
  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
}

export async function storeRefreshToken(
  userId: string,
  refreshToken: string,
  ttlSeconds: number = 7 * 24 * 60 * 60,
) {
  await redis.setex(
    `${REFRESH_TOKEN_PREFIX}${userId}`,
    ttlSeconds,
    refreshToken,
  );
}
