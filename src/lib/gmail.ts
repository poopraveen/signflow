import nodemailer from "nodemailer";

/**
 * Send mail via Gmail SMTP using an App Password (not your normal Gmail password).
 * Server-only — call from Route Handlers, Server Actions, or other Node code.
 */
export async function sendGmailEmail(options: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}): Promise<void> {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!user || !pass) {
    throw new Error(
      "Gmail is not configured: set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local",
    );
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const from = process.env.GMAIL_FROM?.trim() || user;

  await transporter.sendMail({
    from,
    to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    replyTo: options.replyTo,
  });
}
