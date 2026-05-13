import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS must be set in environment variables.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Manarah Institute';

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"${appName}" <${from}>`,
    to,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Use this link (valid 1 hour):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fa;">
        <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 20px rgba(0,70,73,0.08);">
          <h2 style="color:#004649;margin:0 0 8px;">Password Reset</h2>
          <p style="color:#6f7979;margin:0 0 24px;font-size:14px;">
            You requested a password reset for your ${appName} account.
            This link is valid for <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#004649;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Reset Password
          </a>
          <p style="color:#6f7979;margin:24px 0 0;font-size:12px;">
            If you did not request this, ignore this email. Your password will not change.
          </p>
        </div>
      </div>
    `,
  });
}
