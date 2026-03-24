import Anthropic from "@anthropic-ai/sdk";
import { ATSScoreResponseSchema, FACTOR_WEIGHTS } from "./ats-schemas";
import type { ATSScoreResponse, ATSScoreRequest, ATSFactors } from "./ats-schemas";

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

export function buildATSPrompt(input: ATSScoreRequest): string {
  const jobTitleLine = input.job_title
    ? `\nTarget Job Title: ${input.job_title}`
    : "";

  return `You are an ATS (Applicant Tracking System) resume scoring expert.

Analyze the following resume against the job description and score it on exactly 8 factors. Each factor gets a score from 0-100 and a brief explanation (1-2 sentences).

RESUME:
${input.resume_content}

JOB DESCRIPTION:
${input.job_description}${jobTitleLine}

SCORING FACTORS:

1. keyword_match (weight: 20%) — What percentage of key skills, tools, technologies, and terms from the job description appear in the resume?

2. contextual_relevance (weight: 15%) — Are keywords used in meaningful context that demonstrates real experience, or are they just listed? Penalize keyword stuffing. Reward depth.

3. text_formatting_quality (weight: 15%) — Is the text formatting consistent and professional? Check for: consistent date formats, consistent bullet styles, proper capitalization, clean section headers, no special characters that break ATS parsing.

4. job_title_alignment (weight: 10%) — How closely do the candidate's job titles match the target role? Consider title hierarchy and functional similarity.

5. years_of_experience (weight: 10%) — Based on employment dates in the resume, how many total years of relevant experience does the candidate have? Compare to any experience requirements stated or implied in the job description.

6. section_completeness (weight: 10%) — Does the resume contain all standard sections an ATS expects? Check for: contact information, professional summary, work experience, education, skills section.

7. action_verb_usage (weight: 10%) — Do bullet points start with strong, varied action verbs? Penalize weak starts like "Responsible for" or "Helped with". Reward specific action verbs like "Developed", "Implemented", "Led".

8. measurable_results (weight: 10%) — Do bullet points include quantifiable achievements? Look for numbers, percentages, dollar amounts, timeframes, team sizes. More specific metrics score higher.

Return ONLY valid JSON with this exact structure, no other text:
{
  "overall_score": <weighted average as integer 0-100>,
  "factors": {
    "keyword_match": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "contextual_relevance": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "text_formatting_quality": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "job_title_alignment": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "years_of_experience": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "section_completeness": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "action_verb_usage": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "measurable_results": { "score": <0-100>, "explanation": "<1-2 sentences>" }
  }
}`;
}

export function computeOverallScore(factors: ATSFactors): number {
  let total = 0;
  for (const [key, weight] of Object.entries(FACTOR_WEIGHTS)) {
    total += factors[key as keyof ATSFactors].score * weight;
  }
  return Math.round(total);
}

export function parseATSResponse(text: string): ATSScoreResponse {
  const json = JSON.parse(text);
  const parsed = ATSScoreResponseSchema.parse(json);
  // Recompute overall score from weights to ensure consistency
  parsed.overall_score = computeOverallScore(parsed.factors);
  return parsed;
}

export async function scoreResume(input: ATSScoreRequest): Promise<ATSScoreResponse> {
  const prompt = buildATSPrompt(input);

  const response = await getAnthropicClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  return parseATSResponse(content.text);
}
