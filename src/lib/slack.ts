type SlackChannel = "newUser" | "success" | "errors";

const WEBHOOK_ENV: Record<SlackChannel, string> = {
  newUser: "SLACK_WEBHOOK_NEW_USER",
  success: "SLACK_WEBHOOK_SUCCESS",
  errors: "SLACK_WEBHOOK_ERRORS",
};

// Never throws: a Slack outage must not break signups or generations.
export async function notifySlack(channel: SlackChannel, text: string): Promise<void> {
  const url = process.env[WEBHOOK_ENV[channel]];
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`[slack] ${channel} webhook returned ${res.status}`);
  } catch (err) {
    console.error(`[slack] ${channel} webhook failed:`, err);
  }
}
