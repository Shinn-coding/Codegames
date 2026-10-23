import { env } from "@/lib/env";
import { redactDownloadTokens } from "@/lib/download-core";
import { redactLicenseKeys } from "@/lib/license-core";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return "***";
  }
  return `${local.slice(0, 1)}***@${domain}`;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (env.EMAIL_PROVIDER === "console") {
    console.info(
      `[email:console] to=${maskEmail(message.to)} subject=${message.subject}\n${redactDownloadTokens(
        redactLicenseKeys(message.text),
      )}`,
    );
    return;
  }

  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(
      `Resend email failed with status ${response.status}: ${detail}`,
    );
  }
}
