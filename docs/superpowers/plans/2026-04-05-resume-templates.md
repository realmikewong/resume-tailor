# Resume Templates Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new resume templates — Editorial, Bold, and Sharp — to the existing Modern / Classic / Minimal lineup, with distinct fonts, colors, and section header treatments in DOCX output.

**Architecture:** Templates are pure config objects (`TemplateConfig`) consumed by `document-generator.ts`. A new optional field `sectionHeaderStyle` drives how DOCX section headings are rendered. A shared helper function `makeSectionHeader` encapsulates the branching so each call site stays clean. PDF styling remains hardcoded (pre-existing limitation; font embedding out of scope).

**Tech Stack:** Next.js 16 App Router · TypeScript · `docx` library (DOCX generation) · `pdf-lib` (PDF, untouched) · Supabase (Postgres, migration) · React SVG components (template picker UI)

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/004_add_new_templates.sql` | Create — expand CHECK constraint to include new template IDs |
| `src/lib/document-generator.ts` | Modify — extend `TemplateConfig`, add 3 template entries, add `makeSectionHeader` helper, replace inline heading paragraphs |
| `src/components/jobs/template-picker.tsx` | Modify — add 3 SVG preview components, add 3 template entries, remove `as const` |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/004_add_new_templates.sql`

- [ ] **Step 1: Check the actual constraint name**

  Connect to your local Supabase database and run:
  ```sql
  \d generations
  ```
  Look for a CHECK constraint on `template_choice`. The auto-generated name is typically `generations_template_choice_check`. Note the actual name before proceeding.

- [ ] **Step 2: Create the migration file**

  Create `supabase/migrations/004_add_new_templates.sql` with the following content (adjust constraint name if yours differs from the default):

  ```sql
  -- Expand template_choice to include three new templates.
  -- The original constraint was defined inline in 001_initial_schema.sql,
  -- so Postgres auto-named it. IF EXISTS is safe: if the name differs,
  -- the old constraint stays and the new one is added alongside it (harmless).
  ALTER TABLE generations
    DROP CONSTRAINT IF EXISTS generations_template_choice_check;

  ALTER TABLE generations
    ADD CONSTRAINT generations_template_choice_check
    CHECK (template_choice IN ('modern', 'classic', 'minimal', 'editorial', 'bold', 'sharp'));
  ```

- [ ] **Step 3: Run the migration locally**

  ```bash
  supabase db push
  ```

  Expected: migration applies cleanly with no errors.

- [ ] **Step 4: Verify the constraint**

  In your local DB:
  ```sql
  -- Should succeed:
  INSERT INTO generations (template_choice, ...) VALUES ('editorial', ...);

  -- Should fail with a check constraint violation:
  INSERT INTO generations (template_choice, ...) VALUES ('invalid', ...);
  ```

  (Or just query `\d generations` again and confirm the CHECK now includes all 6 values.)

- [ ] **Step 5: Commit**

  ```bash
  git add supabase/migrations/004_add_new_templates.sql
  git commit -m "feat: add editorial, bold, sharp to template_choice constraint"
  ```

---

## Task 2: Extend TemplateConfig and Add New Template Entries

**Files:**
- Modify: `src/lib/document-generator.ts:1-40`

- [ ] **Step 1: Add `BorderStyle` and `UnderlineType` to the `docx` import**

  The current import at the top of `src/lib/document-generator.ts` is:
  ```ts
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
  ```

  Replace it with:
  ```ts
  import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    BorderStyle,
    UnderlineType,
    TabStopPosition,
    TabStopType,
    convertInchesToTwip,
  } from "docx";
  ```

- [ ] **Step 2: Add `sectionHeaderStyle` to the `TemplateConfig` type**

  The current type (lines 14–19):
  ```ts
  type TemplateConfig = {
    headingFont: string;
    bodyFontSize: number;
    headingColor: string;
    accentColor: string;
  };
  ```

  Replace with:
  ```ts
  type TemplateConfig = {
    headingFont: string;
    bodyFontSize: number;
    headingColor: string;
    accentColor: string;
    sectionHeaderStyle?: "default" | "centered-underline" | "ruled";
  };
  ```

- [ ] **Step 3: Add the three new template entries to the `templates` record**

  The current `templates` record ends after `minimal: { ... }` at line 39, before the closing `};`. Add the three new entries so the record looks like:

  ```ts
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
    editorial: {
      headingFont: "Times New Roman",
      bodyFontSize: 24, // 12pt
      headingColor: "000000",
      accentColor: "000000",
      sectionHeaderStyle: "centered-underline",
    },
    bold: {
      headingFont: "Georgia",
      bodyFontSize: 22, // 11pt
      headingColor: "C2410C",
      accentColor: "C2410C",
      sectionHeaderStyle: "default",
    },
    sharp: {
      headingFont: "Arial",
      bodyFontSize: 22, // 11pt
      headingColor: "0F172A",
      accentColor: "64748B",
      sectionHeaderStyle: "ruled",
    },
  };
  ```

- [ ] **Step 4: Verify TypeScript compiles with no errors**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors. (The new fields are optional so existing templates are unaffected.)

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/document-generator.ts
  git commit -m "feat: extend TemplateConfig with sectionHeaderStyle, add editorial/bold/sharp configs"
  ```

---

## Task 3: Add `makeSectionHeader` Helper and Update DOCX Section Headings

**Files:**
- Modify: `src/lib/document-generator.ts` (the `generateResumeDocx` function and surrounding helpers)

This is the core of the feature. Currently, every section heading in `generateResumeDocx` uses:
```ts
new Paragraph({
  text: "Section Name",
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 200, after: 100 },
})
```

The `heading:` shorthand applies Word's built-in heading style and does not support `allCaps`, `underline`, or `border`. We replace it with a helper that builds the `Paragraph` explicitly.

- [ ] **Step 1: Add the `makeSectionHeader` helper function**

  Add this function immediately before `generateResumeDocx` (which starts at approximately line 249):

  ```ts
  function makeSectionHeader(text: string, config: TemplateConfig): Paragraph {
    const style = config.sectionHeaderStyle ?? "default";

    if (style === "centered-underline") {
      return new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            allCaps: true,
            underline: { type: UnderlineType.SINGLE },
            font: config.headingFont,
            color: config.headingColor,
            size: config.bodyFontSize + 2,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 },
      });
    }

    if (style === "ruled") {
      return new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            allCaps: true,
            font: config.headingFont,
            color: config.headingColor,
            size: config.bodyFontSize + 2,
          }),
        ],
        alignment: AlignmentType.LEFT,
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 6,
            color: config.headingColor,
          },
        },
        spacing: { before: 200, after: 100 },
      });
    }

    // "default" — preserve existing behavior using Word's built-in heading style
    return new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    });
  }
  ```

- [ ] **Step 2: Replace the Summary section heading**

  Find (approximately line 290):
  ```ts
  sections.push(
    new Paragraph({
      text: "Summary",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  ```

  Replace with:
  ```ts
  sections.push(makeSectionHeader("Summary", config));
  ```

- [ ] **Step 3: Replace the Experience section heading**

  Find (approximately line 305):
  ```ts
  sections.push(
    new Paragraph({
      text: "Experience",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  ```

  Replace with:
  ```ts
  sections.push(makeSectionHeader("Experience", config));
  ```

- [ ] **Step 4: Replace the Education section heading**

  Find (approximately line 346):
  ```ts
  sections.push(
    new Paragraph({
      text: "Education",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  ```

  Replace with:
  ```ts
  sections.push(makeSectionHeader("Education", config));
  ```

- [ ] **Step 5: Replace the Skills section heading**

  Find (approximately line 368):
  ```ts
  sections.push(
    new Paragraph({
      text: "Skills",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  ```

  Replace with:
  ```ts
  sections.push(makeSectionHeader("Skills", config));
  ```

- [ ] **Step 6: Replace the Additional section heading**

  Find (approximately line 385):
  ```ts
  sections.push(
    new Paragraph({
      text: "Additional",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  ```

  Replace with:
  ```ts
  sections.push(makeSectionHeader("Additional", config));
  ```

- [ ] **Step 7: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 8: Verify the build succeeds**

  ```bash
  npm run build
  ```

  Expected: build completes with no errors.

- [ ] **Step 9: Commit**

  ```bash
  git add src/lib/document-generator.ts
  git commit -m "feat: add makeSectionHeader helper, apply sectionHeaderStyle in DOCX generation"
  ```

---

## Task 4: Add SVG Previews and New Template Entries to TemplatePicker

**Files:**
- Modify: `src/components/jobs/template-picker.tsx`

- [ ] **Step 1: Add the `EditorialPreview` SVG component**

  Add this immediately after the `MinimalPreview` function (around line 126), before the `templates` array:

  ```tsx
  function EditorialPreview() {
    return (
      <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="160" height="200" fill="#ffffff" />
        {/* Name — large bold left-aligned */}
        <rect x="16" y="14" width="90" height="9" rx="1" fill="#000000" />
        {/* Contact — right aligned */}
        <rect x="60" y="27" width="84" height="3" rx="1" fill="#555555" />
        <rect x="72" y="32" width="72" height="3" rx="1" fill="#555555" />
        {/* Section heading — centered with underline */}
        <rect x="45" y="44" width="70" height="5" rx="1" fill="#000000" />
        <line x1="45" y1="51" x2="115" y2="51" stroke="#000000" strokeWidth="0.75" />
        {/* Job 1 */}
        <rect x="16" y="57" width="90" height="3.5" rx="1" fill="#222222" />
        <rect x="110" y="57" width="34" height="3.5" rx="1" fill="#555555" />
        <rect x="20" y="63" width="120" height="2.5" rx="1" fill="#cccccc" />
        <rect x="20" y="67" width="114" height="2.5" rx="1" fill="#cccccc" />
        <rect x="20" y="71" width="118" height="2.5" rx="1" fill="#cccccc" />
        {/* Section heading 2 */}
        <rect x="35" y="83" width="90" height="5" rx="1" fill="#000000" />
        <line x1="35" y1="90" x2="125" y2="90" stroke="#000000" strokeWidth="0.75" />
        {/* Job 2 */}
        <rect x="16" y="96" width="85" height="3.5" rx="1" fill="#222222" />
        <rect x="110" y="96" width="34" height="3.5" rx="1" fill="#555555" />
        <rect x="20" y="102" width="120" height="2.5" rx="1" fill="#cccccc" />
        <rect x="20" y="106" width="108" height="2.5" rx="1" fill="#cccccc" />
        {/* Section heading 3 — Skills */}
        <rect x="50" y="118" width="60" height="5" rx="1" fill="#000000" />
        <line x1="50" y1="125" x2="110" y2="125" stroke="#000000" strokeWidth="0.75" />
        <rect x="16" y="130" width="128" height="2.5" rx="1" fill="#cccccc" />
        <rect x="16" y="135" width="100" height="2.5" rx="1" fill="#cccccc" />
        {/* Section heading 4 — Education */}
        <rect x="42" y="147" width="76" height="5" rx="1" fill="#000000" />
        <line x1="42" y1="154" x2="118" y2="154" stroke="#000000" strokeWidth="0.75" />
        <rect x="16" y="159" width="110" height="2.5" rx="1" fill="#cccccc" />
        <rect x="16" y="164" width="85" height="2.5" rx="1" fill="#cccccc" />
      </svg>
    );
  }
  ```

- [ ] **Step 2: Add the `BoldPreview` SVG component**

  Add immediately after `EditorialPreview`:

  ```tsx
  function BoldPreview() {
    return (
      <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="160" height="200" fill="#ffffff" />
        {/* Name */}
        <rect x="16" y="14" width="85" height="9" rx="1" fill="#C2410C" />
        {/* Contact */}
        <rect x="16" y="27" width="110" height="3" rx="1" fill="#e8a87c" />
        {/* Experience heading — terracotta, left-aligned bold */}
        <rect x="16" y="40" width="55" height="5" rx="1" fill="#C2410C" />
        {/* Job 1 */}
        <rect x="16" y="49" width="88" height="3.5" rx="1" fill="#333333" />
        <rect x="110" y="49" width="34" height="3.5" rx="1" fill="#e8a87c" />
        <rect x="20" y="55" width="120" height="2.5" rx="1" fill="#d1d5db" />
        <rect x="20" y="59" width="115" height="2.5" rx="1" fill="#d1d5db" />
        <rect x="20" y="63" width="118" height="2.5" rx="1" fill="#d1d5db" />
        {/* Job 2 */}
        <rect x="16" y="72" width="82" height="3.5" rx="1" fill="#333333" />
        <rect x="110" y="72" width="34" height="3.5" rx="1" fill="#e8a87c" />
        <rect x="20" y="78" width="122" height="2.5" rx="1" fill="#d1d5db" />
        <rect x="20" y="82" width="110" height="2.5" rx="1" fill="#d1d5db" />
        {/* Skills heading */}
        <rect x="16" y="94" width="32" height="5" rx="1" fill="#C2410C" />
        <rect x="16" y="103" width="128" height="2.5" rx="1" fill="#d1d5db" />
        <rect x="16" y="108" width="100" height="2.5" rx="1" fill="#d1d5db" />
        {/* Education heading */}
        <rect x="16" y="120" width="50" height="5" rx="1" fill="#C2410C" />
        <rect x="16" y="129" width="110" height="2.5" rx="1" fill="#d1d5db" />
        <rect x="16" y="134" width="90" height="2.5" rx="1" fill="#d1d5db" />
      </svg>
    );
  }
  ```

- [ ] **Step 3: Add the `SharpPreview` SVG component**

  Add immediately after `BoldPreview`:

  ```tsx
  function SharpPreview() {
    return (
      <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="160" height="200" fill="#ffffff" />
        {/* Name */}
        <rect x="16" y="14" width="80" height="8" rx="1" fill="#0F172A" />
        {/* Strong rule beneath name */}
        <line x1="16" y1="26" x2="144" y2="26" stroke="#0F172A" strokeWidth="1.5" />
        {/* Contact */}
        <rect x="16" y="30" width="128" height="3" rx="1" fill="#64748B" />
        {/* Experience heading with thin rule */}
        <rect x="16" y="42" width="52" height="4" rx="1" fill="#0F172A" />
        <line x1="16" y1="48" x2="144" y2="48" stroke="#94a3b8" strokeWidth="0.5" />
        {/* Job 1 */}
        <rect x="16" y="52" width="90" height="3.5" rx="1" fill="#1e293b" />
        <rect x="110" y="52" width="34" height="3.5" rx="1" fill="#64748B" />
        <rect x="20" y="58" width="120" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="20" y="62" width="114" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="20" y="66" width="118" height="2.5" rx="1" fill="#cbd5e1" />
        {/* Job 2 */}
        <rect x="16" y="74" width="84" height="3.5" rx="1" fill="#1e293b" />
        <rect x="110" y="74" width="34" height="3.5" rx="1" fill="#64748B" />
        <rect x="20" y="80" width="120" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="20" y="84" width="108" height="2.5" rx="1" fill="#cbd5e1" />
        {/* Skills heading with thin rule */}
        <rect x="16" y="95" width="32" height="4" rx="1" fill="#0F172A" />
        <line x1="16" y1="101" x2="144" y2="101" stroke="#94a3b8" strokeWidth="0.5" />
        <rect x="16" y="105" width="128" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="16" y="110" width="100" height="2.5" rx="1" fill="#cbd5e1" />
        {/* Education heading with thin rule */}
        <rect x="16" y="121" width="48" height="4" rx="1" fill="#0F172A" />
        <line x1="16" y1="127" x2="144" y2="127" stroke="#94a3b8" strokeWidth="0.5" />
        <rect x="16" y="131" width="115" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="16" y="136" width="90" height="2.5" rx="1" fill="#cbd5e1" />
      </svg>
    );
  }
  ```

- [ ] **Step 4: Replace the `templates` array**

  Find the current `templates` array (lines 128–147):
  ```ts
  const templates = [
    {
      id: "modern",
      name: "Modern",
      description: "Clean lines, subtle color accents, sans-serif fonts",
      Preview: ModernPreview,
    },
    {
      id: "classic",
      name: "Classic",
      description: "Traditional layout, serif headings, timeless style",
      Preview: ClassicPreview,
    },
    {
      id: "minimal",
      name: "Minimal",
      description: "Maximum whitespace, typography-focused, no frills",
      Preview: MinimalPreview,
    },
  ] as const;
  ```

  Replace with (note: `as const` removed to allow the wider string literal union):
  ```ts
  const templates = [
    {
      id: "modern",
      name: "Modern",
      description: "Clean lines, subtle color accents, sans-serif fonts",
      Preview: ModernPreview,
    },
    {
      id: "classic",
      name: "Classic",
      description: "Traditional layout, serif headings, timeless style",
      Preview: ClassicPreview,
    },
    {
      id: "minimal",
      name: "Minimal",
      description: "Maximum whitespace, typography-focused, no frills",
      Preview: MinimalPreview,
    },
    {
      id: "editorial",
      name: "Editorial",
      description: "Serif font, black & white, centered underlined section headers",
      Preview: EditorialPreview,
    },
    {
      id: "bold",
      name: "Bold",
      description: "Georgia font, warm terracotta accents, high contrast",
      Preview: BoldPreview,
    },
    {
      id: "sharp",
      name: "Sharp",
      description: "Clean sans-serif, dark navy headings, ruled section dividers",
      Preview: SharpPreview,
    },
  ];
  ```

- [ ] **Step 5: Update the grid to accommodate 6 templates**

  The current grid in `TemplatePicker` is `grid-cols-3`. With 6 templates this renders as 2 rows of 3, which works. If you'd prefer a different layout (e.g., 2 columns on mobile), update the className — otherwise leave it as-is.

- [ ] **Step 6: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 7: Verify the build succeeds**

  ```bash
  npm run build
  ```

  Expected: clean build.

- [ ] **Step 8: Smoke test — open the template picker**

  Start the dev server and navigate to `/dashboard/jobs/new`. Confirm:
  - All 6 templates appear in the picker
  - Each has a visible, distinct SVG preview thumbnail
  - Clicking each template selects it (blue ring)
  - The selected template ID is passed through when you submit the form

- [ ] **Step 9: Commit**

  ```bash
  git add src/components/jobs/template-picker.tsx
  git commit -m "feat: add Editorial, Bold, Sharp SVG previews to template picker"
  ```

---

## Task 5: End-to-End Smoke Test and Production Deploy

- [ ] **Step 1: Generate a resume using each new template**

  In your local or staging environment, generate a resume with:
  - `editorial` template
  - `bold` template
  - `sharp` template

  Download the resulting `.docx` files and open them in Word or LibreOffice.

- [ ] **Step 2: Verify Editorial DOCX**

  Confirm section headings (Experience, Education, Skills, etc.) are:
  - Centered
  - Uppercase
  - Underlined
  - Times New Roman font

- [ ] **Step 3: Verify Bold DOCX**

  Confirm:
  - Candidate name renders in terracotta (`#C2410C`)
  - Date/accent text renders in terracotta
  - Section headings render using Word's built-in Heading 2 style (left-aligned, bold) — `bold` uses `sectionHeaderStyle: "default"`, so heading font/color are governed by the HEADING_2 style definition in the document, not the template config. This is expected behavior, consistent with Modern/Classic/Minimal.

- [ ] **Step 4: Verify Sharp DOCX**

  Confirm section headings are:
  - Left-aligned, bold, uppercase
  - Arial font, dark navy color (`#0F172A`)
  - Thin horizontal rule beneath each heading

- [ ] **Step 5: Run the migration on production**

  ```bash
  supabase db push --linked
  ```

  Or apply the migration via the Supabase dashboard SQL editor if that's your production deploy process.

- [ ] **Step 6: Deploy to production**

  Push to `main` (or your production branch) to trigger a Vercel deployment.

  ```bash
  git push origin main
  ```

- [ ] **Step 7: Verify on production**

  Visit `taylorresume.com/dashboard/jobs/new` and confirm all 6 templates appear. Generate one document using a new template to confirm end-to-end.
