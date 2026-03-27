# Resume-Styled Homepage Design Spec

## Overview

Replace the current generic SaaS landing page with a homepage styled as an actual resume document. The page introduces "Taylor Resumé" as a persona who tailors resumes, using resume conventions (sections, bullet points, job entries) to communicate the product's value proposition. The tone is confident reassurance: empowering the user rather than commiserating with their pain.

## Brand & Persona

- **Name**: Taylor Resumé
- **Tagline**: "Making sure your resumé does you justice"
- **Voice**: First-person (Taylor speaking directly to the visitor). Confident, warm, empowering.
- **Copy rules**:
  - No em-dashes (use colons, periods, commas instead)
  - Always first-person ("I'll match your experience..." not "AI matches...")
  - The persona is consistent throughout the homepage

## Typography

- **Headings, labels, nav**: Inter (loaded from Google Fonts)
- **Body text, bullets, objective**: Georgia (system font, no external load needed)
- Inter for all UI chrome (section titles, job titles, dates, nav links, buttons, footer)
- Georgia for all narrative content (objective statement, bullet descriptions, volunteer description, compensation text, CTA text)

## Homepage Layout

Full-bleed white document. No paper metaphor, no shadow, no background texture. The resume fills the viewport directly, using resume typography and section conventions applied as a webpage.

### Header

Centered layout with a bottom border (2px solid).

- **Name**: "TAYLOR RESUMÉ" in Inter, bold, uppercase, letter-spaced
- **Tagline**: "Making sure your resumé does you justice" in Inter, regular weight, smaller size, muted color
- **Contact line (nav)**: hello@taylorresume.com | taylorresume.com | Get Started (blue, emphasized)
  - Email and URL are displayed as resume-authentic contact info
  - "Get Started" is a CTA link styled in blue to stand out
  - All three are functional links

### Objective

- Section heading: "OBJECTIVE" in Inter, uppercase, letter-spaced, with a bottom border
- Body: Italic Georgia
- Copy: "You've done the hard part: building real skills, gaining real experience, becoming someone worth hiring. I'm here to make sure your resumé does you justice, every time, for every role."
- Alternate copy (banked for future use): "To take the most tedious part of your job search off your plate, so you can focus on landing interviews."

### Experience (How It Works)

Three entries styled as career progression, each with:
- **Job title** (Inter, bold) aligned left, **"Step N"** (Inter, small, muted) aligned right
- **Company/context** line (Georgia, muted) below the title
- **Bullet points** (Georgia) describing the step

**Entry 1: Document Intake Specialist** (Step 1)
- Company: "Getting Started"
- Bullets:
  - Upload your baseline resumé as a Word doc or PDF
  - Your experience, your skills, your story. Securely received.
  - One upload covers every future application

**Entry 2: Tailoring Analyst** (Step 2)
- Company: "The Work"
- Bullets:
  - Paste the job posting you're targeting
  - I'll match your experience to what matters for this role
  - Every resumé is unique, because every job posting is

**Entry 3: Delivery Coordinator** (Step 3)
- Company: "The Result"
- Bullets:
  - Download your tailored resumé and cover letter
  - Formatted, polished, and ready to send
  - Word and PDF formats included

### Volunteer Work (ATS Score Checker)

- Section heading: "VOLUNTEER WORK"
- **Title**: "ATS Compatibility Analyst" (Inter, bold)
- **Organization**: "Community Service. Free, no sign-up required." (Georgia, muted)
- **Description**: "Not sure how your resumé stacks up against applicant tracking systems? Check your ATS compatibility score, on the house." (Georgia)
- **CTA link**: "Check Your Score Free →" (Inter, blue, underlined)
- Links to `/tools/ats-score`

### Compensation (Pricing)

- Section heading: "COMPENSATION"
- **Text**: "Flexible packages starting at free. Competitive rates because job searching is expensive enough." (Georgia)
- **CTA link**: "View Pricing →" (Inter, blue, underlined)
- Links to `/pricing`

### CTA Footer

- Top border (2px solid), centered
- **Text**: "References available upon request. Or just try it: your first 3 tailored resumés are on me." (Georgia)
- **Button**: "GET STARTED FREE" (Inter, uppercase, white text on dark background)
- Links to `/auth/login`

### Page Footer

- Copyright line: "© 2025 Taylor Resumé. All rights reserved." (Inter, small, muted)

## Scroll Behavior

- The resume header (name, tagline, contact line) scrolls away naturally with the page
- Once the header leaves the viewport, a sticky standard nav bar slides in from the top
- The sticky nav matches the standard nav used on all other pages (see below)
- This provides persistent navigation without breaking the resume aesthetic on initial load

## Navigation Strategy

### Homepage

Navigation is embedded in the resume header's contact line:
- hello@taylorresume.com | taylorresume.com | Get Started

No traditional nav bar on initial load. The sticky nav appears on scroll (see Scroll Behavior above).

### All Other Pages (Blog, Pricing, Login, etc.)

Standard nav bar:
- **Left**: "Taylor Resumé" as text logo (Inter, bold), links to homepage
- **Right**: Blog | Pricing | Login | Get Started (button style)
- Same Inter + Georgia type pairing and color palette as the homepage
- These pages do not use the resume metaphor; they are functional and branded consistently

## Color Palette

- **Text**: #1a1a1a (near-black)
- **Body text**: #333
- **Muted text**: #555, #666
- **Light text**: #999 (contact line, dates)
- **CTA blue**: #2563eb (links, Get Started)
- **CTA blue hover**: #1d4ed8
- **Borders**: #1a1a1a (header/footer), #e0e0e0 (section dividers), #ccc (section title underlines)
- **Background**: #fff (page)
- **Button**: #1a1a1a background, #fff text
- **Footer text**: #bbb

## Pages Affected

- `src/app/page.tsx` — Complete rewrite of the landing page
- `src/app/layout.tsx` — Update metadata (title, description), add Inter font
- `src/app/globals.css` — May need adjustments for new font variables
- New: Shared nav component for use on Blog, Pricing, and other pages
- New: Sticky scroll nav component for the homepage
- Existing blog pages — Update to use the new standard nav component

## Out of Scope

- Dedicated pricing page (exists as a link target but not designed here)
- Blog page redesign (uses standard nav, no other changes)
- Login/signup page redesign
- Mobile responsive behavior (to be addressed in a follow-up)
- Dark mode
- Domain/email setup (taylorresume.com, hello@taylorresume.com)
