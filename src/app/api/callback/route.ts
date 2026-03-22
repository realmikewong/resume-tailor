import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDocuments } from "@/lib/document-generator";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const generationId = searchParams.get("generation_id");
  const callbackToken = searchParams.get("callback_token");

  if (!generationId || !callbackToken) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Validate callback token
  const { data: generation, error } = await admin
    .from("generations")
    .select("*, resumes(*), jobs(*)")
    .eq("id", generationId)
    .eq("callback_token", callbackToken)
    .single();

  if (error || !generation) {
    return NextResponse.json({ error: "Invalid callback" }, { status: 403 });
  }

  if (generation.status !== "processing") {
    return NextResponse.json({ error: "Generation not in processing state" }, { status: 409 });
  }

  const body = await request.json();
  const { tailored_resume_content, cover_letter_content } = body;

  if (!tailored_resume_content || !cover_letter_content) {
    // Mark as failed and refund
    await admin
      .from("generations")
      .update({ status: "failed" })
      .eq("id", generationId);
    await admin.rpc("refund_credit", {
      p_user_id: generation.user_id,
      p_reason: "refund_malformed_callback",
    });
    return NextResponse.json({ error: "Missing content" }, { status: 400 });
  }

  try {
    // Store raw content
    await admin
      .from("generations")
      .update({
        tailored_resume_content,
        cover_letter_content,
      })
      .eq("id", generationId);

    // Generate formatted documents
    const docs = await generateDocuments({
      generationId,
      userId: generation.user_id,
      templateChoice: generation.template_choice,
      resumeContent: tailored_resume_content,
      coverLetterContent: cover_letter_content,
      jobTitle: generation.jobs.job_title,
      companyName: generation.jobs.company_name,
    });

    // Upload files to Supabase Storage
    const filePaths: Record<string, string> = {};

    for (const [key, { buffer, contentType }] of Object.entries(docs)) {
      const path = `${generation.user_id}/generations/${generationId}/${key}`;
      await admin.storage.from("documents").upload(path, buffer, { contentType });
      filePaths[key] = path;
    }

    // Update generation with file paths and mark complete
    await admin
      .from("generations")
      .update({
        resume_word_file_path: filePaths["resume.docx"],
        resume_pdf_file_path: filePaths["resume.pdf"],
        cover_letter_word_file_path: filePaths["cover-letter.docx"],
        cover_letter_pdf_file_path: filePaths["cover-letter.pdf"],
        status: "completed",
      })
      .eq("id", generationId);

    // Auto-create application tracker entry
    await admin.from("applications").insert({
      user_id: generation.user_id,
      job_id: generation.job_id,
      generation_id: generationId,
      status: "generated",
    });

    return NextResponse.json({ success: true });
  } catch {
    await admin
      .from("generations")
      .update({ status: "failed" })
      .eq("id", generationId);
    await admin.rpc("refund_credit", {
      p_user_id: generation.user_id,
      p_reason: "refund_document_generation_failed",
    });
    return NextResponse.json(
      { error: "Document generation failed" },
      { status: 500 }
    );
  }
}
