# Design System

This document outlines the core design principles and token values for our digital products.

## Theme Overview

The app uses two visual contexts:

- **App UI** — the main authenticated experience (teal palette, `constants/theme.ts`)
- **Paywall / Purchase flow** — warmer, more minimal (forest-and-parchment palette, `components/paywall/paywall-tokens.ts`)

Both contexts support light and dark modes. The paywall is intentionally distinct to signal a focused, low-pressure moment.

---

## Colors

### App UI Palette (`constants/theme.ts`)

| Role | Light | Dark |
|---|---|---|
| Background | `#F4F4F2` | `#0F1F1E` |
| Surface (cards) | `#FFFFFF` | `#1A2B28` |
| Primary text | `#1A2B28` | `#E8F0EE` |
| Secondary text / icons | `#607D8B` | `#8FA8A3` |
| Brand / tint | `#2C554E` | `#4A9B8E` |
| Border | `#DDE1E0` | `#2E4B48` |
| Success | `#4A7C59` | `#4CAF7D` |
| Error | `#B04A3A` | `#E57373` |
| Warning | `#C48B2C` | `#FFB74D` |

### Paywall Palette (`components/paywall/paywall-tokens.ts` — `MC.*`)

| Role | Value |
|---|---|
| Background | `#F7F5F1` — warm parchment |
| Surface (cards) | `#FFFFFF` |
| Primary text | `#1E1E1A` |
| Secondary text | `#7B7B74` |
| Brand accent | `#234536` — deep forest green; CTAs, selected states, dots |
| Tint fill | `#E7EFEA` — soft sage; selected card backgrounds |
| Border | `#DEDAD2` — warm stone |

Tone: calm, warm, premium. No urgency colours. No orange, red, or countdown-style treatments.

---

## Typography

### Font Families

| Role | Family | Usage |
|---|---|---|
| Headlines | `Manrope_700Bold` | Screen titles, section headers |
| Subheadings | `Manrope_600SemiBold` | Card labels, button text, emphasis |
| Body | `Manrope_400Regular` | Paragraphs, descriptions, secondary copy |
| Labels / UI | `Inter_500Medium` | Chips, tags, small metadata |
| Label bold | `Inter_700Bold` | Strong labels |

### Type Scale (Paywall)

| Name | Size | Weight | Usage |
|---|---|---|---|
| Large title | 34pt | 700 | Outcome screen hero heading |
| Section title | 28pt | 700 | Screen titles (Trust, Main, Trial, Exit) |
| Body | 17pt | 400 | Paragraph copy, benefit rows |
| Secondary | 15pt | 400 | Subtitles, helper text, reassurances |
| Button label | 17pt | 600 | Primary and secondary button labels |
| Badge / micro | 10–13pt | 700 | Plan badges, legal links |

### Type Scale (App UI)

Follows the same Manrope family. Key sizes: 32pt bold (screen titles), 16pt regular (body), 11pt semibold uppercase (section headers), 14pt (card metadata).

---

## Shape

| Context | Radius | Usage |
|---|---|---|
| App UI — small | 6pt | Chips, badges |
| App UI — medium | 10pt | Inputs, small cards |
| App UI — large | 12–16pt | Main cards, sheets |
| Paywall — cards | 18pt | ProofCard, PlanCard, ExitOfferCard |
| Paywall — buttons | 18pt | PrimaryButton |
| Pill / full | 9999pt | Tags, avatar circles |

---

## Spacing

8pt base grid throughout.

| Name | Value | Usage |
|---|---|---|
| xs | 4pt | Tight gaps, icon padding |
| sm | 8pt | Internal card gaps |
| md | 16pt | Default padding |
| lg | 24pt | Horizontal screen padding, section gaps |
| xl | 32pt | Large section breaks |
| xxl | 48pt | Hero spacing |

Paywall-specific:
- Horizontal padding: 24pt
- Section gap: 24pt
- Card gap: 12pt
- Title-to-body gap: 12pt
- Above CTA: 24pt

---

## Components

### App UI

- **Cards**: white surface, 1pt border (`#DDE1E0`), radius 12–16pt, optional shadow
- **Buttons**: `backgroundColor: tint`, radius 14pt, white text, shadow for primary actions
- **Badges**: `color + '22'` background, `color + '55'` border, radius 20pt pill
- **Tab bar**: `position: absolute` on iOS, haptic feedback on tap

### Paywall

- **PrimaryButton**: full-width, height 56pt, radius 18pt, bg `#234536`, white `17pt/600` text
- **SecondaryButton**: no background, `#7B7B74` text, height 44pt
- **ProofCard**: white bg, 1pt `#DEDAD2` border, radius 18pt, 18pt padding, italic quote text
- **PlanCard**: side-by-side pair, min-height 100pt, 1.5pt border; selected = `#234536` border + `#E7EFEA` bg; optional top-right badge pill
- **TimelineStep**: left dot + vertical connector line, heading 17pt/600, body 15pt/400
- **LegalLinks**: 12pt, `#7B7B74`, centered, `·` separator
- **ExitOfferCard**: `#E7EFEA` bg, `#234536` border 1.5pt, radius 18pt, centred badge + large price

---

## Tone

**App UI**: functional, clear, organised. Warm teal conveys trust and control.

**Paywall**: calm, premium, reassuring. Never salesy, never urgent.
- No countdown timers
- No red or orange urgency colours
- No "last chance" or scarcity language
- Quiet confidence — the product speaks for itself
