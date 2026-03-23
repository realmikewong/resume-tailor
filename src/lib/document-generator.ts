import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TabStopPosition,
  TabStopType,
  convertInchesToTwip,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type TemplateConfig = {
  headingFont: string;
  bodyFontSize: number;
  headingColor: string;
  accentColor: string;
};

const templates: Record<string, TemplateConfig> = {
  modern: {
    headingFont: "Calibri",
    bodyFontSize: 22, // half-points (11pt)
    headingColor: "2563EB",
    accentColor: "3B82F6",
  },
  classic: {
    headingFont: "Times New Roman",
    bodyFontSize: 24, // 12pt
    headingColor: "1F2937",
    accentColor: "4B5563",
  },
  minimal: {
    headingFont: "Arial",
    bodyFontSize: 20, // 10pt
    headingColor: "000000",
    accentColor: "6B7280",
  },
};

// Shape returned by GPT prompts
type GptResumeData = {
  name: string;
  contact: {
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    linkedin?: string;
  };
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    start_date: string;
    end_date: string;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    location?: string;
    year: string;
  }>;
  skills: string[];
  additional?: string[];
};

// Normalized shape used by document generators
type ResumeData = {
  name: string;
  contact: string;
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    dates: string;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  skills: string[];
  additional?: string[];
};

function normalizeResumeData(raw: GptResumeData): ResumeData {
  const contactParts: string[] = [];
  if (raw.contact.city && raw.contact.state) {
    contactParts.push(`${raw.contact.city}, ${raw.contact.state}`);
  } else if (raw.contact.city) {
    contactParts.push(raw.contact.city);
  }
  if (raw.contact.phone) contactParts.push(raw.contact.phone);
  if (raw.contact.email) contactParts.push(raw.contact.email);
  if (raw.contact.linkedin) contactParts.push(raw.contact.linkedin);

  return {
    name: raw.name,
    contact: contactParts.join(" | "),
    summary: raw.summary,
    experience: raw.experience.map((exp) => ({
      title: exp.title,
      company: exp.company,
      location: exp.location,
      dates: `${exp.start_date} – ${exp.end_date}`,
      bullets: exp.bullets,
    })),
    education: raw.education.map((edu) => ({
      degree: edu.degree,
      school: edu.school,
      year: edu.year,
    })),
    skills: raw.skills,
    additional: raw.additional,
  };
}

// Shape returned by GPT prompts
type GptCoverLetterData = {
  date?: string;
  applicant?: {
    name: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    linkedin?: string;
  };
  recipient?: {
    name?: string;
    company?: string;
  };
  greeting: string;
  body: string[];
  signoff: string;
  name: string;
};

// Normalized shape used by document generators
type CoverLetterData = {
  date?: string;
  applicantInfo?: string;
  recipientInfo?: string;
  greeting: string;
  body: string[];
  signoff: string;
  name: string;
};

function normalizeCoverLetterData(raw: GptCoverLetterData): CoverLetterData {
  let applicantInfo: string | undefined;
  if (raw.applicant) {
    const parts: string[] = [raw.applicant.name];
    if (raw.applicant.city && raw.applicant.state) {
      parts.push(`${raw.applicant.city}, ${raw.applicant.state}`);
    }
    const contactParts: string[] = [];
    if (raw.applicant.phone) contactParts.push(raw.applicant.phone);
    if (raw.applicant.email) contactParts.push(raw.applicant.email);
    if (raw.applicant.linkedin) contactParts.push(raw.applicant.linkedin);
    if (contactParts.length) parts.push(contactParts.join(" | "));
    applicantInfo = parts.join("\n");
  }

  let recipientInfo: string | undefined;
  if (raw.recipient) {
    const parts: string[] = [];
    if (raw.recipient.name) parts.push(raw.recipient.name);
    if (raw.recipient.company) parts.push(raw.recipient.company);
    recipientInfo = parts.join("\n");
  }

  return {
    date: raw.date,
    applicantInfo,
    recipientInfo,
    greeting: raw.greeting,
    body: raw.body,
    signoff: raw.signoff,
    name: raw.name,
  };
}

type GenerateInput = {
  generationId: string;
  userId: string;
  templateChoice: string;
  resumeContent: string;
  coverLetterContent: string;
  jobTitle: string;
  companyName: string;
};

type DocOutput = {
  buffer: Buffer;
  contentType: string;
};

export async function generateDocuments(
  input: GenerateInput
): Promise<Record<string, DocOutput>> {
  const config = templates[input.templateChoice] ?? templates.modern;

  let resumeData: ResumeData;
  let coverLetterData: CoverLetterData;

  try {
    const rawResume: GptResumeData = JSON.parse(input.resumeContent);
    resumeData = normalizeResumeData(rawResume);
    const rawCoverLetter: GptCoverLetterData = JSON.parse(input.coverLetterContent);
    coverLetterData = normalizeCoverLetterData(rawCoverLetter);
  } catch {
    throw new Error("Failed to parse content from Make.com. Expected JSON format.");
  }

  const resumeDocx = await generateResumeDocx(resumeData, config);
  const resumePdf = await generateResumePdf(resumeData, config);
  const coverLetterDocx = await generateCoverLetterDocx(coverLetterData, config);
  const coverLetterPdf = await generateCoverLetterPdf(coverLetterData, config);

  return {
    "resume.docx": {
      buffer: resumeDocx,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    "resume.pdf": {
      buffer: resumePdf,
      contentType: "application/pdf",
    },
    "cover-letter.docx": {
      buffer: coverLetterDocx,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    "cover-letter.pdf": {
      buffer: coverLetterPdf,
      contentType: "application/pdf",
    },
  };
}

async function generateResumeDocx(
  data: ResumeData,
  config: TemplateConfig
): Promise<Buffer> {
  const sections: Paragraph[] = [];

  // Name (Title)
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.name,
          bold: true,
          size: 48,
          font: config.headingFont,
          color: config.headingColor,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Contact
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.contact,
          size: config.bodyFontSize,
          color: config.accentColor,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Summary
  if (data.summary) {
    sections.push(
      new Paragraph({
        text: "Summary",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: data.summary, size: config.bodyFontSize })],
        spacing: { after: 200 },
      })
    );
  }

  // Experience
  sections.push(
    new Paragraph({
      text: "Experience",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  for (const exp of data.experience) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${exp.title} | ${exp.company}`, bold: true, size: config.bodyFontSize }),
          new TextRun({ text: `\t${exp.dates}`, size: config.bodyFontSize, color: config.accentColor }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 150, after: 50 },
      })
    );
    if (exp.location) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.location, size: config.bodyFontSize, color: config.accentColor, italics: true }),
          ],
          spacing: { after: 50 },
        })
      );
    }
    for (const bullet of exp.bullets) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: bullet, size: config.bodyFontSize })],
          bullet: { level: 0 },
          spacing: { before: 30, after: 30 },
        })
      );
    }
  }

  // Education
  sections.push(
    new Paragraph({
      text: "Education",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  for (const edu of data.education) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${edu.degree} — ${edu.school}`, bold: true, size: config.bodyFontSize }),
          new TextRun({ text: `\t${edu.year}`, size: config.bodyFontSize, color: config.accentColor }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 50, after: 50 },
      })
    );
  }

  // Skills
  sections.push(
    new Paragraph({
      text: "Skills",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: data.skills.join("  •  "), size: config.bodyFontSize }),
      ],
    })
  );

  // Additional
  if (data.additional && data.additional.length > 0) {
    sections.push(
      new Paragraph({
        text: "Additional",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );
    for (const item of data.additional) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: item, size: config.bodyFontSize })],
          bullet: { level: 0 },
          spacing: { before: 30, after: 30 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: sections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

async function generateResumePdf(
  data: ResumeData,
  _config: TemplateConfig
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  const margin = 72; // 1 inch
  let y = height - margin;

  const drawText = (text: string, options: {
    font?: typeof font;
    size?: number;
    color?: { r: number; g: number; b: number };
    x?: number;
    maxWidth?: number;
  } = {}) => {
    const f = options.font ?? font;
    const size = options.size ?? 11;
    const x = options.x ?? margin;

    if (y < margin + 40) {
      page = pdfDoc.addPage([612, 792]);
      y = height - margin;
    }

    page.drawText(text, {
      x,
      y,
      size,
      font: f,
      color: options.color ? rgb(options.color.r, options.color.g, options.color.b) : rgb(0, 0, 0),
      maxWidth: options.maxWidth ?? width - 2 * margin,
    });

    y -= size + 4;
  };

  // Name
  drawText(data.name, { font: boldFont, size: 24 });
  y -= 4;

  // Contact
  drawText(data.contact, { size: 10, color: { r: 0.4, g: 0.4, b: 0.4 } });
  y -= 12;

  // Summary
  if (data.summary) {
    drawText("Summary", { font: boldFont, size: 14 });
    y -= 2;
    drawText(data.summary, { size: 10 });
    y -= 8;
  }

  // Experience
  drawText("Experience", { font: boldFont, size: 14 });
  y -= 2;
  for (const exp of data.experience) {
    drawText(`${exp.title} | ${exp.company}`, { font: boldFont, size: 11 });
    const metaParts: string[] = [];
    if (exp.location) metaParts.push(exp.location);
    metaParts.push(exp.dates);
    drawText(metaParts.join(" | "), { size: 9, color: { r: 0.4, g: 0.4, b: 0.4 } });
    for (const bullet of exp.bullets) {
      drawText(`  •  ${bullet}`, { size: 10 });
    }
    y -= 6;
  }

  // Education
  drawText("Education", { font: boldFont, size: 14 });
  y -= 2;
  for (const edu of data.education) {
    drawText(`${edu.degree} — ${edu.school} (${edu.year})`, { size: 10 });
  }
  y -= 8;

  // Skills
  drawText("Skills", { font: boldFont, size: 14 });
  y -= 2;
  drawText(data.skills.join("  •  "), { size: 10 });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function generateCoverLetterDocx(
  data: CoverLetterData,
  config: TemplateConfig
): Promise<Buffer> {
  const paragraphs: Paragraph[] = [];

  // Applicant info
  if (data.applicantInfo) {
    for (const line of data.applicantInfo.split("\n")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: config.bodyFontSize })],
          spacing: { after: 40 },
        })
      );
    }
    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
  }

  // Date
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.date ?? new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          size: config.bodyFontSize,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // Recipient
  if (data.recipientInfo) {
    for (const line of data.recipientInfo.split("\n")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: config.bodyFontSize })],
          spacing: { after: 40 },
        })
      );
    }
    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
  }

  // Greeting
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: data.greeting, size: config.bodyFontSize })],
      spacing: { after: 200 },
    })
  );

  // Body paragraphs
  for (const para of data.body) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: para, size: config.bodyFontSize })],
        spacing: { after: 200 },
      })
    );
  }

  // Sign-off
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: data.signoff, size: config.bodyFontSize })],
      spacing: { before: 200, after: 100 },
    })
  );

  // Name
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: data.name, bold: true, size: config.bodyFontSize }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

async function generateCoverLetterPdf(
  data: CoverLetterData,
  _config: TemplateConfig
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const margin = 72;
  let y = height - margin;

  const drawText = (text: string, f = font, size = 11) => {
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: f,
      maxWidth: width - 2 * margin,
    });
    y -= size + 6;
  };

  // Applicant info
  if (data.applicantInfo) {
    for (const line of data.applicantInfo.split("\n")) {
      drawText(line, font, 10);
    }
    y -= 12;
  }

  // Date
  drawText(
    data.date ?? new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );
  y -= 8;

  // Recipient
  if (data.recipientInfo) {
    for (const line of data.recipientInfo.split("\n")) {
      drawText(line, font, 11);
    }
    y -= 8;
  }

  // Greeting
  drawText(data.greeting);
  y -= 8;

  // Body
  for (const para of data.body) {
    drawText(para);
    y -= 8;
  }

  y -= 12;

  // Sign-off
  drawText(data.signoff);
  y -= 4;
  drawText(data.name, boldFont);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
