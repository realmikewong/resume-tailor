# Magic Link Email Design Spec

## Overview

Redesign the Magic Link authentication email to be on-brand with Taylor Resumé's visual identity. The email is purely functional — no marketing content, no footer, no contact info.

## Design Decisions

- **Style direction**: Accent bar (Option C) — thin black bar at top, left-aligned content, clean and minimal
- **Tone**: Functional and direct, matching the app's professional-but-conversational voice
- **Subject line**: "Sign in to Taylor Resumé"

## Template Specification

**Where to configure**: Supabase Dashboard → Authentication → Notifications → Email → Magic Link

**Subject**: `Sign in to Taylor Resumé`

**HTML Template**:

```html
<div style="max-width: 480px; margin: 0 auto; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff;">
  <!-- Accent bar -->
  <div style="height: 3px; background: #1a1a1a;"></div>
  <!-- Body -->
  <div style="padding: 36px 32px;">
    <div style="font-size: 15px; font-weight: 700; color: #1a1a1a; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 28px;">Taylor Resumé</div>
    <div style="font-size: 14px; color: #1a1a1a; line-height: 1.6; margin-bottom: 24px;">Click the button below to sign in to your account.</div>
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 32px; font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; text-decoration: none;">Sign In</a>
    <div style="font-size: 12px; color: #999; margin-top: 24px; line-height: 1.5;">If you didn't request this link, you can safely ignore this email.</div>
  </div>
</div>
```

## Brand Alignment

| Element | Value | Source |
|---------|-------|--------|
| Primary color | `#1a1a1a` | Site's `--foreground` / CTA buttons |
| Font | Inter (with system fallbacks) | Site's `--font-inter` |
| Letter spacing | `3px` (brand name), `2px` (button) | Matches site's `tracking-[4px]` / `tracking-wider` |
| Text transform | Uppercase for brand name and CTA | Matches site pattern |
| Max width | 480px | Standard email width |
| Button style | Black bg, white text, uppercase, semibold | Matches site's primary CTA |

## Implementation

This is a dashboard-only change. No code changes required.

1. Go to Supabase Dashboard → Authentication → Notifications → Email
2. Select the Magic Link template
3. Replace the subject line with: `Sign in to Taylor Resumé`
4. Replace the HTML body with the template above
5. Save and test by triggering a sign-in from the app
