import { z } from "zod";

export const ThankYouEmailRequestSchema = z.object({
  job_description: z.string().min(1).max(10000),
  resume_content: z.string().min(1).max(8000),
  interviewer_name: z.string().min(1).max(100),
  interviewer_title: z.string().min(1).max(200),
  memorable_moment: z.string().min(1).max(1000),
});

export type ThankYouEmailRequest = z.infer<typeof ThankYouEmailRequestSchema>;

export const THANK_YOU_EMAIL_SYSTEM_PROMPT =
  "You are a professional career coach writing a post-interview thank you email on behalf of a job candidate. Write concisely and authentically. Output the email only — no commentary, no markdown, no code blocks.";

export function buildThankYouEmailPrompt(input: ThankYouEmailRequest): string {
  return `Write a thank you email with the following details:

Interviewer: ${input.interviewer_name}, ${input.interviewer_title}
Memorable moment from the interview: ${input.memorable_moment}

Candidate's resume:
${input.resume_content}

Job description:
${input.job_description}

Requirements:
- Include a subject line on the first line (format: "Subject: ...")
- Blank line, then the email body
- Greet the interviewer by first name
- Express genuine gratitude for their time
- Reference the memorable moment naturally in 1-2 sentences
- Connect one relevant aspect of the candidate's background to the role
- Keep it 150-200 words total
- Professional but warm tone
- End with a forward-looking close`;
}
