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

export const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  "$2b$10$Tje$2b$10$TjeapdmfrKm754V8aSOi3dclI1IkdIBtYwsh/U/iFaWQ2WQy6WapdmfrKm7BtYwsh/U/iFaWWQy6W";
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "$$2b$10$TjeapdmfrKm754V8tbFaSOi3dclI1IkdIBtYwsh/U/iFaWQ2WQy6W3dclI1IkdIBtYwsh/U/iFaWQ2WQy6W";
export const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "1h";
export const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
export const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:3000/api/v1/auth/oauth/google/callback";
export const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
export const GITHUB_REDIRECT_URI =
  process.env.GITHUB_REDIRECT_URI ||
  "http://localhost:3000/api/v1/auth/oauth/github/callback";

export const TOTP_ISSUER = process.env.TOTP_ISSUER || "Auth Service";
