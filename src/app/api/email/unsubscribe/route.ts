import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response(htmlPage("Invalid link", "This unsubscribe link is invalid."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    return new Response(htmlPage("Invalid link", "This unsubscribe link is invalid or has been tampered with."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ email_opt_out: true })
    .eq("user_id", userId);

  if (error) {
    console.error("[unsubscribe] Failed to update profile:", error);
    return new Response(htmlPage("Error", "Something went wrong. Please try again."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  return new Response(
    htmlPage(
      "Unsubscribed",
      "You've been unsubscribed from Taylor Resumé emails. You can re-enable emails in your account settings."
    ),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Taylor Resumé</title>
  <style>
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f6f6f6;
      color: #1a1a1a;
    }
    .card {
      background: white;
      padding: 48px;
      max-width: 400px;
      text-align: center;
    }
    .brand {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    p { font-size: 14px; line-height: 1.6; color: #666; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Taylor Resumé</div>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
