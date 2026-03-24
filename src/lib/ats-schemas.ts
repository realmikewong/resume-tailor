import { z } from "zod";

const FactorScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  explanation: z.string().min(1).max(500),
});

export const ATSFactorsSchema = z.object({
  keyword_match: FactorScoreSchema,
  contextual_relevance: FactorScoreSchema,
  text_formatting_quality: FactorScoreSchema,
  job_title_alignment: FactorScoreSchema,
  years_of_experience: FactorScoreSchema,
  section_completeness: FactorScoreSchema,
  action_verb_usage: FactorScoreSchema,
  measurable_results: FactorScoreSchema,
});

export const ATSScoreResponseSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  factors: ATSFactorsSchema,
});

export const ATSScoreRequestSchema = z.object({
  resume_content: z.string().min(1).max(15000),
  job_description: z.string().min(1).max(10000),
  job_title: z.string().max(200).optional(),
});

export type ATSScoreResponse = z.infer<typeof ATSScoreResponseSchema>;
export type ATSScoreRequest = z.infer<typeof ATSScoreRequestSchema>;
export type ATSFactors = z.infer<typeof ATSFactorsSchema>;

export const FACTOR_WEIGHTS: Record<keyof ATSFactors, number> = {
  keyword_match: 0.2,
  contextual_relevance: 0.15,
  text_formatting_quality: 0.15,
  job_title_alignment: 0.1,
  years_of_experience: 0.1,
  section_completeness: 0.1,
  action_verb_usage: 0.1,
  measurable_results: 0.1,
};

export const FACTOR_LABELS: Record<keyof ATSFactors, string> = {
  keyword_match: "Keyword Match",
  contextual_relevance: "Contextual Relevance",
  text_formatting_quality: "Text Formatting Quality",
  job_title_alignment: "Job Title Alignment",
  years_of_experience: "Years of Experience",
  section_completeness: "Section Completeness",
  action_verb_usage: "Action Verb Usage",
  measurable_results: "Measurable Results",
};
