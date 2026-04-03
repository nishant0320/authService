import transporter, { EMAIL_FROM } from "../../config/emailConfig";
import logger from "../../config/loggerConfig";
import { EmailOptions } from "../../types";
import { renderTemplate, template } from "../format/mails";

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error: any) {
    logger.error(`Failed to send email to ${options.to}`, {
      error: error.message,
    });
    return false;
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: template.welcome.subject,
    html: renderTemplate(template.welcome.html, { name }),
  });
}
export async function sendOtpEmail(
  to: string,
  name: string,
  otp: string | number,
  expiry: string | number,
): Promise<boolean> {
  return sendEmail({
    to,
    subject: template.otp.subject,
    html: renderTemplate(template.otp.html, { name, otp, expiry }),
  });
}
export async function sendPasswordChangedEmail(
  to: string,
  name: string,
  changedAt: string | number,
): Promise<boolean> {
  return sendEmail({
    to,
    subject: template.passwordChanged.subject,
    html: renderTemplate(template.passwordChanged.html, { name, changedAt }),
  });
}

export async function sendPasswordlessLoginEmail(
  to: string,
  name: string,
  expiry: string | number,
  loginUrl: string,
): Promise<boolean> {
  return sendEmail({
    to,
    subject: template.passwordlessLogin.subject,
    html: renderTemplate(template.passwordlessLogin.html, {
      name,
      loginUrl,
      expiry,
    }),
  });
}
export async function sendVerificationEmail(
  to: string,
  name: string,
  verifyUrl: string,
): Promise<boolean> {
  return sendEmail({
    to,
    subject: template.emailVerification.subject,
    html: renderTemplate(template.emailVerification.html, { name, verifyUrl }),
  });
}
export async function sendAccountLockedEmail(
  to: string,
  name: string,
  lockedUntil: string | number,
): Promise<boolean> {
  return sendEmail({
    to,
    subject: template.accountLocked.subject,
    html: renderTemplate(template.accountLocked.html, { name, lockedUntil }),
  });
}
