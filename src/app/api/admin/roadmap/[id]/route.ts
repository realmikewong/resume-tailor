import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/roadmap/admin-guard";
import { AdminPatchSchema } from "@/lib/roadmap/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const supabase = await createClient();
  const check = await requireAdmin(supabase);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = AdminPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const admin = createAdminClient();

  // Build the update object. If the new status is 'complete', stamp shipped_at.
  // If transitioning away from 'complete', clear it. Handling the "clear on
  // transition away" case requires knowing the current status, so fetch it first.
  let current: { status: string } | null = null;
  if (parsed.data.status) {
    const { data } = await admin.from("roadmap_items").select("status").eq("id", id).single();
    current = data;
  }

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "complete") update.shipped_at = new Date().toISOString();
  else if (current?.status === "complete" && parsed.data.status) {
    update.shipped_at = null;
  }

  const { data, error } = await admin
    .from("roadmap_items")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const supabase = await createClient();
  const check = await requireAdmin(supabase);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("roadmap_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
