# Resume Templates Expansion — Design Spec

**Date:** 2026-04-05
**Status:** Approved

## Overview

Add three new resume (and cover letter) templates — **Editorial**, **Bold**, and **Sharp** — alongside the existing three (Modern, Classic, Minimal). Templates are styling-only: font, font size, heading color, accent color, and section header visual treatment. No layout structure changes.

## Background

Users are asking for wider template variety. The initial request came from a user in the creative/film industry who preferred a traditional serif black-and-white style not currently available. Rather than name templates by industry (which pigeonholes users), templates are named by visual style so any user can choose the aesthetic that suits them.

## Full Template Lineup

| Name | Status | Font | Body Size | Heading Color | Accent Color | Header Style |
|---|---|---|---|---|---|---|
| Modern | Existing | Calibri | 11pt | #2563EB | #3B82F6 | Default |
| Classic | Existing | Times New Roman | 12pt | #1F2937 | #4B5563 | Default |
| Minimal | Existing | Arial | 10pt | #000000 | #6B7280 | Default |
| **Editorial** | New | Times New Roman | 12pt | #000000 | #000000 | Centered + underlined uppercase |
| **Bold** | New | Georgia | 11pt | #C2410C | #C2410C | Default |
| **Sharp** | New | Arial | 11pt | #0F172A | #64748B | Ruled (thin rule beneath header) |

### Header Style Definitions

- **default** — left-aligned, bold, same treatment as existing templates
- **centered-underline** — centered, bold, uppercase, underlined (matches traditional academic/film CV style)
- **ruled** — left-aligned, bold, uppercase, with a thin horizontal rule beneath the header text

## Files Changed

### 1. `src/lib/document-generator.ts`

**`TemplateConfig` type** — add one optional field:

```ts
type TemplateConfig = {
  headingFont: string;
  bodyFontSize: number;
  headingColor: string;
  accentColor: string;
  sectionHeaderStyle?: 'default' | 'centered-underline' | 'ruled';
};
```

`sectionHeaderStyle` defaults to `'default'` when absent (preserving existing template behavior).

**`templates` record** — add three entries:

```ts
editorial: {
  headingFont: 'Times New Roman',
  bodyFontSize: 24,        // 12pt in half-points
  headingColor: '000000',
  accentColor: '000000',
  sectionHeaderStyle: 'centered-underline',
},
bold: {
  headingFont: 'Georgia',
  bodyFontSize: 22,        // 11pt in half-points
  headingColor: 'C2410C',
  accentColor: 'C2410C',
  sectionHeaderStyle: 'default',
},
sharp: {
  headingFont: 'Arial',
  bodyFontSize: 22,        // 11pt in half-points
  headingColor: '0F172A',
  accentColor: '64748B',
  sectionHeaderStyle: 'ruled',
},
```

**DOCX section header rendering** (`generateResumeDocx` only — cover letters have no section headers) — update the paragraph that renders section headings to branch on `config.sectionHeaderStyle`. Note: the existing code uses `heading: HeadingLevel.HEADING_2` shorthand; the `centered-underline` and `ruled` styles will require replacing this with an explicit `Paragraph` + `TextRun` construction to support `allCaps`, `underline`, and border properties:

- `centered-underline`: alignment = CENTER, allCaps = true, underline = single
- `ruled`: alignment = LEFT, allCaps = true, add a bottom border (thin rule) to the paragraph
- `default`: existing behavior unchanged

**PDF section header rendering** — the existing PDF generators (`generateResumePdf`, `generateCoverLetterPdf`) do not currently apply any `TemplateConfig` values (font, color, size are all hardcoded to Helvetica/black). Wiring up full PDF styling is out of scope for this change — it requires font embedding for Times New Roman and Georgia, which `pdf-lib`'s `StandardFonts` does not support. PDF output will continue to use hardcoded Helvetica styling regardless of template choice. This is a known limitation to be addressed in a future iteration.

The `sectionHeaderStyle` field will be applied to **DOCX output only** for this release.

### 2. `src/components/jobs/template-picker.tsx`

The `templates` array currently ends with `as const`, which makes the `id` field a string literal union. Adding new entries will require removing or adjusting the `as const` assertion to avoid a type error.

Add three new entries to the `templates` array:

```ts
{
  id: 'editorial',
  name: 'Editorial',
  description: 'Serif font, black & white, centered underlined section headers',
  Preview: EditorialPreview,
},
{
  id: 'bold',
  name: 'Bold',
  description: 'Georgia font, warm terracotta accents, high contrast',
  Preview: BoldPreview,
},
{
  id: 'sharp',
  name: 'Sharp',
  description: 'Clean sans-serif, dark navy headings, ruled section dividers',
  Preview: SharpPreview,
},
```

Each `Preview` is a small SVG component matching the style of the existing `ModernPreview`, `ClassicPreview`, and `MinimalPreview` components already in the file.

### 3. `supabase/migrations/004_add_new_templates.sql`

Update the `template_choice` CHECK constraint on the `generations` table to include the three new values. The original constraint was defined inline in `001_initial_schema.sql`, so Postgres auto-generated the name. Verify the actual constraint name before running (`\d generations`), but the standard auto-generated name is `generations_template_choice_check`. The `DROP CONSTRAINT IF EXISTS` is safe — if the name differs, the old constraint remains and the `ADD CONSTRAINT` still succeeds, so the net result is two CHECK constraints (harmless but worth verifying after migration).

```sql
ALTER TABLE generations
  DROP CONSTRAINT IF EXISTS generations_template_choice_check;

ALTER TABLE generations
  ADD CONSTRAINT generations_template_choice_check
  CHECK (template_choice IN ('modern', 'classic', 'minimal', 'editorial', 'bold', 'sharp'));
```

## What Does Not Change

- Generation flow (`/api/generate`, `/api/callback`)
- Make.com scenario
- Database schema structure (no new columns)
- Analytics event tracking (`template_choice` is already captured)
- Middleware, auth, or any other app logic

## Out of Scope

- Two-column or sidebar layouts
- Industry-specific section ordering
- Colored header bands / background fills behind the candidate name
- Cover letter template divergence from resume template (cover letters use the same config)
