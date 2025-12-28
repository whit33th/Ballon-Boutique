export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  void options;
  console.warn("[mailer] Email sending is disabled.");
  return false;
}
