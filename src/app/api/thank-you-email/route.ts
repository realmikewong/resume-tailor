import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  ThankYouEmailRequestSchema,
  buildThankYouEmailPrompt,
  THANK_YOU_EMAIL_SYSTEM_PROMPT,
} from "@/lib/thank-you-email";

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  const parsed = ThankYouEmailRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    const field = firstError.path.join(".");
    if (firstError.code === "too_big") {
      return NextResponse.json(
        { error: `${field} exceeds character limit`, code: "INPUT_TOO_LONG" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Invalid input: ${field} - ${firstError.message}`, code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  const anthropic = getAnthropicClient();
  const prompt = buildThankYouEmailPrompt(parsed.data);

  try {
    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: THANK_YOU_EMAIL_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[thank-you-email] Anthropic error:", err);
    return NextResponse.json(
      { error: "Failed to generate email", code: "GENERATION_FAILED" },
      { status: 500 }
    );
  }
}
