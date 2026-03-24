import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ATSScoreResponseSchema } from "@/lib/ats-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { base_ats_scores, tailored_ats_scores } = body;

    // Validate score shapes if provided
    if (base_ats_scores) {
      ATSScoreResponseSchema.parse(base_ats_scores);
    }
    if (tailored_ats_scores) {
      ATSScoreResponseSchema.parse(tailored_ats_scores);
    }

    // Verify the generation belongs to the user
    const { data: generation } = await supabase
      .from("generations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // Save scores
    const { error } = await supabase
      .from("generations")
      .update({
        ...(base_ats_scores && { base_ats_scores }),
        ...(tailored_ats_scores && { tailored_ats_scores }),
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save ATS scores:", error);
    return NextResponse.json(
      { error: "Failed to save scores" },
      { status: 500 }
    );
  }
}
