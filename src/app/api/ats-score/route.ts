import { NextResponse } from "next/server";
import { ATSScoreRequestSchema } from "@/lib/ats-schemas";
import { scoreResume } from "@/lib/ats-scorer";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = ATSScoreRequestSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
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

    const scores = await scoreResume(parsed.data);

    return NextResponse.json(scores);
  } catch (error) {
    console.error("ATS scoring failed:", error);
    return NextResponse.json(
      { error: "Failed to compute ATS score", code: "SCORING_FAILED" },
      { status: 500 }
    );
  }
}
