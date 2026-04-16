import { Resend } from "resend";
import { type ReactElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Taylor Resumé <hello@taylorresume.com>";

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<{ id: string | null; error: string | null }> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      react,
    });

    if (error) {
      console.error("[resend] Send failed:", error);
      return { id: null, error: error.message };
    }

    return { id: data?.id ?? null, error: null };
  } catch (err) {
    console.error("[resend] Unexpected error:", err);
    return { id: null, error: "Unexpected error sending email" };
  }
}
