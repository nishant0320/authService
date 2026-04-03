import { MailTemplate } from "../../types";

export function renderTemplate(
  html: string,
  params: Record<string, string | number | any>,
): string {
  return html.replace(/\$\{(\w+)\}/g, (_, key) => String(params[key] ?? ""));
}

export const template: MailTemplate = {
  welcome: {
    subject: "Welcome to Our Service",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome, \${name}!</h2>
        
        <p>Thanks for signing up.</p>
        
        <p>Your account has been successfully created. You can now securely log in and start using the service.</p>
        
        <p>If you did not create this account, please contact support immediately.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb;" />
        
        <p style="color: #6b7280; font-size: 0.875rem;">
          This is an automated message. Please do not reply.
        </p>
      </div>
    `,
  },

  otp: {
    subject: "Your OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Your OTP Code</h2>

        <p>Hello, \${name}.</p>

        <p>Use the following OTP to continue:</p>

        <div style="margin: 24px 0; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; text-align: center;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1d4ed8;">\${otp}</span>
        </div>

        <p>This code will expire in <strong>\${expiryMinutes} minutes</strong>.</p>

        <p>If you did not request this OTP, please ignore this email.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb;" />

        <p style="color: #6b7280; font-size: 0.875rem;">
          Never share this OTP with anyone.
        </p>
      </div>
    `,
  },

  forgotOtp: {
    subject: "Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Password Reset OTP</h2>

        <p>Hello, \${name}.</p>

        <p>We received a request to reset your password.</p>

        <p>Use the OTP below to continue:</p>

        <div style="margin: 24px 0; padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; text-align: center;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #b91c1c;">\${otp}</span>
        </div>

        <p>This code will expire in <strong>\${expiryMinutes} minutes</strong>.</p>

        <p>If you did not request a password reset, please ignore this email.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb;" />

        <p style="color: #6b7280; font-size: 0.875rem;">
          This is an automated message. Please do not reply.
        </p>
      </div>
    `,
  },

  passwordChanged: {
    subject: "Your Password Has Been Changed",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Password Changed Successfully</h2>

        <p>Hello, \${name}.</p>

        <p>Your password has been changed successfully.</p>

        <p><strong>Changed at:</strong> \${changedAt}</p>

        <p>If you made this change, no action is needed.</p>

        <p>If you did not make this change, please reset your password immediately and contact support.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb;" />

        <p style="color: #6b7280; font-size: 0.875rem;">
          This is a security notification. Please do not reply.
        </p>
      </div>
    `,
  },

  passwordlessLogin: {
    subject: "Your Secure Sign-In Link",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Passwordless Sign-In</h2>

        <p>Hello, \${name}.</p>

        <p>Use the button below to securely sign in to your account:</p>

        <div style="margin: 24px 0; text-align: center;">
          <a 
            href="\${loginUrl}" 
            style="display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;"
          >
            Sign In Securely
          </a>
        </div>

        <p>This link will expire in <strong>\${expiry} minutes</strong>.</p>

        <p>If the button does not work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #2563eb;">\${loginUrl}</p>

        <p>If you did not request this login link, please ignore this email.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb;" />

        <p style="color: #6b7280; font-size: 0.875rem;">
          Never share this sign-in link with anyone.
        </p>
      </div>
    `,
  },

  emailVerification: {
    subject: "Verify Your Email Address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Verify Your Email Address</h2>

        <p>Hello, \${name}.</p>

        <p>Please verify your email address by clicking the button below:</p>

        <div style="margin: 24px 0; text-align: center;">
          <a 
            href="\${verifyUrl}" 
            style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;"
          >
            Verify Email
          </a>
        </div>

        <p>If the button does not work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #2563eb;">\${verifyUrl}</p>

        <p>If you did not create this account, please ignore this email.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb;" />

        <p style="color: #6b7280; font-size: 0.875rem;">
          This verification link may expire for security reasons.
        </p>
      </div>
    `,
  },

  accountLocked: {
    subject: "Your Account Has Been Temporarily Locked",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Account Temporarily Locked</h2>

        <p>Hello, \${name}.</p>

        <p>Your account has been temporarily locked due to multiple failed login attempts.</p>

        <p><strong>Locked until:</strong> \${lockedUntil}</p>

        <p>If this was you, please wait until the lock expires and try again.</p>

        <p>If this was not you, we recommend resetting your password immediately.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb;" />

        <p style="color: #6b7280; font-size: 0.875rem;">
          This is an automated security alert. Please do not reply.
        </p>
      </div>
    `,
  },
};
