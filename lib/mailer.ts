export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.warn(
      "[mailer] Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.",
    );
    return false;
  }

  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword },
  });

  try {
    await transporter.sendMail({
      from: gmailUser,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code !== "undefined"
        ? ` code=${String((error as { code?: unknown }).code)}`
        : "";
    console.error(
      `[mailer] Failed to send email.${code} message=${message}`,
      error,
    );
    return false;
  }

  return true;
}
