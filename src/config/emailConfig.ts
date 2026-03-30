import nodemailer from "nodemailer";
import {
  SMTP_FROM_EMAIL,
  SMTP_FROM_NAME,
  SMTP_HOST,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_USER,
} from "./serverConfig";
import logger from "./loggerConfig";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

export const EMAIL_FROM = `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`;

transporter
  .verify()
  .then(() => logger.info("SMTP transporter verified"))
  .catch((err) =>
    logger.warn("SMTP verification failed (emails will not send)", {
      error: err.message,
    }),
  );

export default transporter;
