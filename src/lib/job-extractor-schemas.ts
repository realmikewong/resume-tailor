import { z } from 'zod';

export const extractJobRequestSchema = z.object({
  raw_text: z
    .string()
    .min(50, 'Please paste more of the job posting content')
    .max(50000, 'Content is too long. Please paste only the job posting.'),
});

export type ExtractJobRequest = z.infer<typeof extractJobRequestSchema>;

export const extractedJobFieldsSchema = z.object({
  company_name: z.string(),
  job_title: z.string(),
  job_description: z.string(),
  pay_range_low: z.number().nullable(),
  pay_range_high: z.number().nullable(),
  job_location: z.string(),
  location_type: z.enum(['remote', 'hybrid', 'on-site', '']),
  is_staffing_agency: z.boolean(),
});

export type ExtractedJobFields = z.infer<typeof extractedJobFieldsSchema>;
