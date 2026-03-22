import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapeJobUrl } from "@/lib/scraper";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url); // validate URL format
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const { fields, rawText } = await scrapeJobUrl(url);

  if (!fields) {
    return NextResponse.json(
      { error: "Could not extract job details from this URL. Please enter the details manually.", rawText },
      { status: 422 }
    );
  }

  return NextResponse.json({ fields });
}
