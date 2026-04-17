import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";
import { SubmitBodySchema } from "@/lib/roadmap/types";
import { FeatureRequestEmail } from "@/emails/feature-request";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = SubmitBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Description must be 10–2000 characters" }, { status: 400 });
  }

  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) {
    console.error("[roadmap/submit] ADMIN_NOTIFICATION_EMAIL not set");
    return NextResponse.json({ error: "Feature not configured" }, { status: 500 });
  }

  const { error } = await sendEmail({
    to,
    subject: `Feature request from ${user.email}`,
    react: FeatureRequestEmail({
      userEmail: user.email,
      userId: user.id,
      description: parsed.data.description,
    }),
  });

  if (error) return NextResponse.json({ error: "Couldn't send — try again" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
