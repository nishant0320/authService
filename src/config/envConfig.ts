import dotenv from "dotenv";

dotenv.config();

export const PORT = Number(process.env.PORT) || 3001;
export const DATABASE_URL = process.env.DATABASE_URL;
export const NODE_ENV = process.env.NODE_ENV || "development";
export const BCRYPT_SALT_ROUND = Number(process.env.BCRYPT_SALT_ROUND) || 10;
export const LOG_LEVEL =
  process.env.LOG_LEVEL || (NODE_ENV === "development" ? "debug" : "info");

export const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
export const SMTP_USER = process.env.SMTP_USER || "";
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";
export const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "AuthService";
export const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || "noreply@authservice.com";

export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
export const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "1h";
export const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";
