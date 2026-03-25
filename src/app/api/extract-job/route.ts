import { NextRequest, NextResponse } from 'next/server';
import { extractJobRequestSchema } from '@/lib/job-extractor-schemas';
import { extractJobFields } from '@/lib/job-extractor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = extractJobRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const fields = await extractJobFields(validated.data.raw_text);

    return NextResponse.json({ fields });
  } catch (error) {
    console.error('Job extraction failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to extract job details', details: message },
      { status: 500 }
    );
  }
}
