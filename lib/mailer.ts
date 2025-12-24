import nodemailer from "nodemailer";

/**
 * Gmail SMTP transporter using App Password authentication.
 *
 * Required environment variables:
 * - GMAIL_USER: Your Gmail address (e.g., ballonboutique.at@gmail.com)
 * - GMAIL_APP_PASSWORD: 16-character App Password from Google
 *
 * To generate an App Password:
 * 1. Enable 2-Step Verification on your Google account
 * 2. Go to https://myaccount.google.com/apppasswords
 * 3. Generate a new App Password for "Mail"
 */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.error(
            "[mailer] Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables"
        );
        return false;
    }

    try {
        const info = await transporter.sendMail({
            from: `"Ballon Boutique" <${GMAIL_USER}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });

        console.log("[mailer] Email sent successfully:", info.messageId);
        return true;
    } catch (error) {
        console.error("[mailer] Failed to send email:", error);
        return false;
    }
}

export default transporter;
