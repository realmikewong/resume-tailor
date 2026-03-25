import { extractJobRequestSchema, extractedJobFieldsSchema } from '@/lib/job-extractor-schemas';

describe('extractJobRequestSchema', () => {
  it('accepts valid raw_text input', () => {
    const result = extractJobRequestSchema.safeParse({ raw_text: 'Some job posting text here that is long enough to pass the minimum character requirement for validation' });
    expect(result.success).toBe(true);
  });

  it('rejects empty raw_text', () => {
    const result = extractJobRequestSchema.safeParse({ raw_text: '' });
    expect(result.success).toBe(false);
  });

  it('rejects raw_text under 50 characters', () => {
    const result = extractJobRequestSchema.safeParse({ raw_text: 'Too short' });
    expect(result.success).toBe(false);
  });

  it('rejects raw_text over 50000 characters', () => {
    const result = extractJobRequestSchema.safeParse({ raw_text: 'a'.repeat(50001) });
    expect(result.success).toBe(false);
  });
});

describe('extractedJobFieldsSchema', () => {
  it('accepts valid extracted fields', () => {
    const result = extractedJobFieldsSchema.safeParse({
      company_name: 'Apple',
      job_title: 'Software Engineer',
      job_description: 'Build great products',
      pay_range_low: 120000,
      pay_range_high: 180000,
      job_location: 'Cupertino, CA',
      location_type: 'on-site',
      is_staffing_agency: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null pay ranges', () => {
    const result = extractedJobFieldsSchema.safeParse({
      company_name: 'Apple',
      job_title: 'Software Engineer',
      job_description: 'Build great products',
      pay_range_low: null,
      pay_range_high: null,
      job_location: '',
      location_type: '',
      is_staffing_agency: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = extractedJobFieldsSchema.safeParse({
      company_name: 'Apple',
    });
    expect(result.success).toBe(false);
  });
});
