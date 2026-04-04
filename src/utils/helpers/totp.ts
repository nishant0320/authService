import { generateSecret, verify, generateURI } from "otplib";
import QRCode from "qrcode";
import { TOTP_ISSUER } from "../../config/envKeys";

export function generateTotpSecret(): string {
  return generateSecret();
}

export async function verifyTotpToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const result = await verify({ token, secret });
  return result.valid;
}

export async function generateTotpQrCode(
  email: string,
  secret: string,
): Promise<string> {
  const otpauth = generateURI({
    issuer: TOTP_ISSUER,
    label: email,
    secret,
    strategy: "totp",
  });

  return QRCode.toDataURL(otpauth);
}
