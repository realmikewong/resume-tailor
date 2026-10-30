import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDocuments } from "@/lib/document-generator";

const anthropic = new Anthropic();
const MODEL = "claude-sonnet-4-6";

function buildResumePrompt(resume: string, jobDescription: string): string {
  return `JOB DESCRIPTION ALIGNMENT RULES

You will receive both:
1. A job description
2. A source resume

Your goal is to align the resume with the job description while preserving factual accuracy.

Follow these rules strictly:

- Identify important keywords, tools, and competencies in the job description.
- Understand the underlying skill or competency each keyword represents. Express that competency using natural language drawn from the candidate's own experience, not the job description's wording.
- Where the candidate's experience aligns with what the job description is looking for, rewrite that experience to make the connection clear -- but use language that sounds like the candidate, not language lifted from the posting.
- Highlight experience that best matches the role.
- Reorder bullet points so the most relevant experience appears first.
- Write bullets in active, specific, human-sounding language. Avoid corporate buzzwords or phrases that sound like they were copied from a job posting. A real person wrote this resume.

Do NOT:
- Invent new experience
- Add new skills that are not present in the source resume
- Change job titles, companies, or dates
- Add tools or technologies not mentioned in the original resume
- Add specifics the source resume does not state: no new numbers, channels (e.g. phone, email, online), audiences, outcomes, or locations. If a detail is not in the source resume, leave it out. A location that is not listed stays an empty string.

Do NOT copy phrases, sentences, or distinctive wording from the job description into the resume. The resume should sound like the candidate wrote it, not like the job posting.

If the candidate has relevant experience that uses different terminology, rewrite it to convey the same competency in the candidate's own voice. Do not borrow phrasing from the job description to do this.

WRITE LIKE A PERSON, NOT AN AI
- Do not use em dashes (—) anywhere. Use commas, periods, or split into two sentences.
- Do not use: actually, truly, really, simply, just, very, incredibly, deeply, genuinely.
- Do not use: delve, leverage, spearhead, utilize, harness, foster, robust, seamless, dynamic, passionate, results-driven, proven track record, elevate, embark, journey, tapestry, realm, landscape, testament, underscore, pivotal, crucial, vital, "fast-paced."
- Avoid filler phrases and idioms like "the right information in the right hands at the right time" or "slip through the cracks." State what was done.

Base Resume:${resume}

Job Description: ${jobDescription}

OUTPUT FORMAT

Return ONLY valid JSON with no commentary, no markdown, no code fences. Use this exact structure:

{
  "name": "Full Name",
  "contact": {
    "city": "City",
    "state": "State",
    "phone": "Phone number",
    "email": "Email address",
    "linkedin": "LinkedIn URL or empty string"
  },
  "summary": "Professional summary paragraph tailored to the job description",
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, State",
      "start_date": "Start Date",
      "end_date": "End Date or Present",
      "bullets": [
        "Achievement or responsibility tailored to the job description",
        "Second bullet point"
      ]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "school": "School Name",
      "location": "City, State",
      "year": "Graduation Year"
    }
  ],
  "additional": ["Certification or additional item 1", "Item 2"]
}

RULES:
- Include all sections that exist in the source resume
- If a section is empty or missing from the source resume, use an empty array []
- If contact fields are missing, use empty strings
- Order experience entries chronologically (most recent first)
- Order bullets within each role with the most relevant to the job description first
- Do not include any text outside the JSON object
`;
}

function buildCoverLetterPrompt(input: {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  tailoredResume: string;
  today: string;
}): string {
  return `You write clear, human-sounding cover letters that avoid corporate filler.
Your task is to write a tailored cover letter using the job description and resume provided.

GOALS
- Align the cover letter with the job description
- Highlight the most relevant experience from the resume
- Reflect the priorities and competencies in the job description, expressed in the candidate's own words
- Maintain factual accuracy based on the resume
- Keep the tone professional, confident, and concise

RULES
- Do not invent experience, skills, tools, or accomplishments
- Do not change job titles, companies, or employment dates
- Only reference experience that appears in the resume
- Do not add specifics the resume does not state: no new numbers, channels, audiences, or outcomes
- If the job description mentions specific priorities or technologies, emphasize related experience from the resume
- Do not copy phrases or sentences verbatim from the job description. Express the same idea in the candidate's own voice.

STYLE
- Write in clear professional language
- Avoid clichés and overly generic phrases
- Focus on impact and relevance
- Keep paragraphs concise
- Prefer active voice and concrete detail over adjectives. Show the work instead of labeling it.

WRITE LIKE A PERSON, NOT AN AI
Follow these rules so the writing does not read as machine-generated.

Punctuation and structure
- Do not use em dashes (—) anywhere. Use commas, periods, parentheses, or split into two sentences.
- Do not stack items in threes for rhythm. Avoid triads like "fast, scalable, and reliable." Vary sentence and list length.
- Do not open sentences with participial wind-ups like "Having led..." or "Leveraging my background...". Start with the subject.

Banned framing
- Do not use contrast framing such as "it's not X, it's Y," "not just X, but Y," or "more than X, it's Y."
- Do not use "whether it's X or Y" constructions.

Banned filler and intensifiers
- Do not use: actually, truly, really, simply, just, very, incredibly, deeply.

Banned AI vocabulary (use plain alternatives)
- delve, leverage, spearhead, utilize, harness, foster, robust, seamless, dynamic, passionate, results-driven, proven track record, elevate, embark, journey, tapestry, realm, landscape, testament, underscore, pivotal, crucial, vital, "in today's world," "fast-paced."

Transitions
- Do not use moreover, furthermore, additionally, or in conclusion. Connect ideas with plain language or start a new sentence.

Company: ${input.companyName}
Role: ${input.jobTitle}
Job Description: ${input.jobDescription}
Tailored Resume: ${input.tailoredResume}
Today's Date: ${input.today}

OUTPUT FORMAT
Return ONLY valid JSON with no commentary, no markdown, no code fences. Use this exact structure:
{
  "date": "MM/DD/YYYY",
  "applicant": {
    "name": "Full Name",
    "city": "City",
    "state": "State",
    "phone": "Phone number",
    "email": "Email address",
    "linkedin": "LinkedIn URL or empty string"
  },
  "recipient": {
    "name": "Hiring Manager",
    "company": "Company Name"
  },
  "greeting": "Dear Hiring Manager,",
  "body": [
    "First paragraph: Brief introduction expressing interest in the role and company. Mention the job title and connect it to the candidate's background.",
    "Second paragraph: Highlight the most relevant experience and connect it to the job description priorities.",
    "Third paragraph: Additional examples of relevant strengths, skills, or accomplishments.",
    "Fourth paragraph: Closing expressing interest in discussing the role further."
  ],
  "signoff": "Sincerely,",
  "name": "Full Name"
}

RULES:
- The body array must contain exactly 4 paragraphs
- Do not include any text outside the JSON object
- Use the applicant's information from the tailored resume
- Before answering, check every paragraph: no em dashes, none of the banned words above (especially "actually" and "just"), and no claim that is not in the resume`;
}

async function completeJson(prompt: string, maxTokens: number): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block?.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  let text = block.text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  JSON.parse(text);
  return text;
}

function todayMMDDYYYY(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

export async function tailorContent(input: {
  resumeText: string;
  jobDescription: string;
  jobTitle: string;
  companyName: string;
}): Promise<{ tailored_resume_content: string; cover_letter_content: string }> {
  const tailored_resume_content = await completeJson(
    buildResumePrompt(input.resumeText, input.jobDescription),
    4096
  );
  const cover_letter_content = await completeJson(
    buildCoverLetterPrompt({
      companyName: input.companyName,
      jobTitle: input.jobTitle,
      jobDescription: input.jobDescription,
      tailoredResume: tailored_resume_content,
      today: todayMMDDYYYY(),
    }),
    2048
  );
  return { tailored_resume_content, cover_letter_content };
}

export async function processGeneration(generationId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: generation, error } = await admin
    .from("generations")
    .select("*, resumes(*), jobs(*)")
    .eq("id", generationId)
    .single();

  if (error || !generation) {
    console.error("[generation] not found:", generationId, error);
    return;
  }

  try {
    const { tailored_resume_content, cover_letter_content } = await tailorContent({
      resumeText: generation.resumes.raw_text_content,
      jobDescription: generation.jobs.job_description,
      jobTitle: generation.jobs.job_title,
      companyName: generation.jobs.company_name,
    });

    await admin
      .from("generations")
      .update({ tailored_resume_content, cover_letter_content })
      .eq("id", generationId);

    const docs = await generateDocuments({
      generationId,
      userId: generation.user_id,
      templateChoice: generation.template_choice,
      resumeContent: tailored_resume_content,
      coverLetterContent: cover_letter_content,
      jobTitle: generation.jobs.job_title,
      companyName: generation.jobs.company_name,
    });

    const filePaths: Record<string, string> = {};
    for (const [key, { buffer, contentType }] of Object.entries(docs)) {
      const path = `${generation.user_id}/generations/${generationId}/${key}`;
      const { error: uploadError } = await admin.storage
        .from("documents")
        .upload(path, buffer, { contentType, upsert: true });
      if (uploadError) throw uploadError;
      filePaths[key] = path;
    }

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

    await admin.from("applications").insert({
      user_id: generation.user_id,
      job_id: generation.job_id,
      generation_id: generationId,
      status: "generated",
    });
  } catch (err) {
    console.error("[generation] failed:", generationId, err);
    await admin.from("generations").update({ status: "failed" }).eq("id", generationId);
    await admin.rpc("refund_credit", {
      p_user_id: generation.user_id,
      p_reason: "refund_generation_failed",
    });
  }
}
