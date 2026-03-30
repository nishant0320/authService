import transporter, { EMAIL_FROM } from "../../config/emailConfig";
import logger from "../../config/loggerConfig";
import { EmailOptions } from "../../types";

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

export async function sendWelcomeEmail(
  to: string,
  name: string,
): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Welcome to Our Service",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome, ${name}!</h2>
        
        <p>Thanks for signing up.</p>
        
        <p>Your account has been successfully created. You can now securely log in and start using the service.</p>
        
        <p>If you did not create this account, please contact support immediately.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb;" />
        
        <p style="color: #6b7280; font-size: 0.875rem;">
          This is an automated message. Please do not reply.
        </p>
      </div>
    `,
  });
}
