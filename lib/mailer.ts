export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = process.env.SMTP_PORT ?? "465";
  const user = process.env.SMTP_USER ?? process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS ?? process.env.GMAIL_APP_PASSWORD;
  const from =
    process.env.SMTP_FROM || user || process.env.GMAIL_USER || "no-reply@localhost";

  if (!user || !pass) {
    console.warn(
      "[mailer] Email is not configured. Set SMTP_USER/SMTP_PASS or GMAIL_USER/GMAIL_APP_PASSWORD.",
    );
    return false;
  }

  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  return true;
}
