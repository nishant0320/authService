import { generateSecret, verify } from "otplib";

export function generateTotpSecret(): string {
  return generateSecret();
}

export async function verifyTotpToken(token: string, secret: string): Promise<boolean> {
  const result = await verify({ token, secret });
  return result.valid;
}
