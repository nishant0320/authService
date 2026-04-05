export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuditLogEntry {
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  details?: Record<string, any>;
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}