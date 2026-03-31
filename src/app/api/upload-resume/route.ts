import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractTextFromBuffer } from "@/lib/resume-parser";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const contentTypeMap: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  const resolvedContentType = contentTypeMap[ext ?? ""];

  if (!resolvedContentType) {
    return NextResponse.json(
      { error: "Only .docx and .pdf files are supported" },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractTextFromBuffer(buffer, file.name);

    if (!rawText || rawText.length < 50) {
      return NextResponse.json(
        { error: "Could not extract meaningful text from this file. Try a different format." },
        { status: 422 }
      );
    }

    // Upload file to Supabase Storage
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const admin = createAdminClient();

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(filePath, buffer, { contentType: resolvedContentType });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Deactivate any currently active resume
    await supabase
      .from("resumes")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);

    // Insert resume record
    const { data: resume, error: insertError } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        raw_text_content: rawText,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save resume" },
        { status: 500 }
      );
    }

    return NextResponse.json({ resume });
  } catch {
    return NextResponse.json(
      { error: "Failed to process file. Try a different format." },
      { status: 422 }
    );
  }
}
