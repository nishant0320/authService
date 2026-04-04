import {
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_API_VERSION,
  WHATSAPP_PHONE_NUMBER_ID,
} from "../../config/envConfig";
import logger from "../../config/loggerConfig";
import { InternalServerError } from "../errors/error";

export function isWhatsAppConfigured(): boolean {
  return Boolean(WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppVerificationCode(
  to: string,
  code: string,
  name = "User",
): Promise<boolean> {
  if (!isWhatsAppConfigured()) {
    throw new InternalServerError(
      "WhatsApp messaging is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    );
  }

  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: `Hi ${name}, your AuthService verification code is ${code}. It expires in 5 minutes.`,
        },
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    logger.error("WhatsApp verification message failed", { message });
    throw new InternalServerError("Failed to send WhatsApp verification message.");
  }

  logger.info(`WhatsApp verification code sent to ${to}`);
  return true;
}
