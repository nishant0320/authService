export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type MailTemplate = Record<
  string,
  {
    subject: string;
    html: string;
  }
>;

export type RegisterBody = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  gender: string;
};
export type LoginBody = {
  email: string;
  password: string;
  totpToken: string | any;
};

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
