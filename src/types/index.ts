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
