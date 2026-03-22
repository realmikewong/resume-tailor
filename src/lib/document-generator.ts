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

type ResumeData = {
  name: string;
  contact: string;
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    dates: string;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  skills: string[];
};

type CoverLetterData = {
  greeting: string;
  body: string[];
  signoff: string;
  name: string;
};

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
    resumeData = JSON.parse(input.resumeContent);
    coverLetterData = JSON.parse(input.coverLetterContent);
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
          new TextRun({ text: `${exp.title} — ${exp.company}`, bold: true, size: config.bodyFontSize }),
          new TextRun({ text: `\t${exp.dates}`, size: config.bodyFontSize, color: config.accentColor }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 150, after: 50 },
      })
    );
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
    drawText(`${exp.title} — ${exp.company}`, { font: boldFont, size: 11 });
    drawText(exp.dates, { size: 9, color: { r: 0.4, g: 0.4, b: 0.4 } });
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

  // Date
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          size: config.bodyFontSize,
        }),
      ],
      spacing: { after: 400 },
    })
  );

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

  // Date
  drawText(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );
  y -= 20;

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
