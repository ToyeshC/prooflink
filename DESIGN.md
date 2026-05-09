---
name: Prooflink
description: On-chain skill oracle for decentralized developer credentialing
colors:
  ink: "#0C0C0A"
  ink-surface: "#111110"
  ink-raised: "#181816"
  oracle-amber: "#E8A020"
  archive-cream: "#F0EDE6"
  cream-mid: "#9A978F"
  cream-dim: "#4A4844"
  signal-green: "#4CAF6E"
  dispute-red: "#C0473A"
typography:
  display:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(2.5rem, 8vw, 6.25rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.04em"
  headline:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.06em"
  title:
    fontFamily: "'Geist Mono', monospace"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.04em"
  body:
    fontFamily: "'Geist Mono', monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0.02em"
  label:
    fontFamily: "'Geist Mono', monospace"
    fontSize: "0.5625rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.16em"
rounded:
  sharp: "0px"
  circle: "50%"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "28px"
  section: "88px"
components:
  button-primary:
    backgroundColor: "{colors.oracle-amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sharp}"
    padding: "14px 32px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.oracle-amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sharp}"
    padding: "14px 32px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cream-mid}"
    rounded: "{rounded.sharp}"
    padding: "11px 18px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "transparent"
    textColor: "{colors.archive-cream}"
    rounded: "{rounded.sharp}"
    padding: "11px 18px"
    height: "44px"
  input:
    backgroundColor: "{colors.ink-surface}"
    textColor: "{colors.archive-cream}"
    rounded: "{rounded.sharp}"
    padding: "12px 16px"
---

# Design System: Prooflink

## 1. Overview

**Creative North Star: "The Signal Oracle"**

Prooflink is the API endpoint that hiring AI agents hit at 2am. No human in the loop. The interface reads clean because machines read it first — and humans who trust machines can read it too. Every design decision serves one directive: make a trust primitive legible at machine speed and human glance simultaneously.

The system is built from institutional restraint and metrological precision. Surfaces are dark not because tools are dark, but because this is infrastructure: the SRE console, the certificate authority interface, the verification terminal. The scene is a developer's second monitor at night, the hiring agent's API call log, the oracle query that returns in milliseconds. Nothing decorative survives this scene.

Typography is the primary carrier of weight. Bebas Neue for names and verdicts — compressed, permanent, unapologetic. Geist Mono for evidence and data — calibrated, machine-native, honest. No warmth is performed. Trust is earned through precision.

**Key Characteristics:**
- Sharp corners everywhere. Zero border-radius signals precision, not softness.
- Tonal depth via background steps (ink → ink-surface → ink-raised), never shadows.
- Oracle Amber as the sole accent — active states, verdicts, CTAs. Rarity is the point.
- Border opacity ramp (7% → 14%) as the only elevation signal at rest.
- Monospace-first: the credential system speaks in machine-readable formats.

## 2. Colors: The Oracle Palette

One void, one signal, one verdict. The palette is deliberate austerity: near-total darkness interrupted only where the oracle speaks.

### Primary
- **Oracle Amber** (#E8A020 / oklch(72% 0.17 72)): The oracle's active signal. Used for primary CTAs, active tab states, verified status indicators, terminal prompts, cursor blink, focus rings on inputs, and the ticker label. Never decorative. When Oracle Amber appears, something meaningful is happening.

### Neutral
- **Ink** (#0C0C0A / oklch(8% 0.003 92)): The void. Primary page background. Slightly warm (chroma 0.003) — never pure black.
- **Ink Surface** (#111110 / oklch(10% 0.003 90)): Card and surface background. The first tonal step above the void. Distinguishes interactive containers from the page plane.
- **Ink Raised** (#181816 / oklch(13% 0.004 90)): Slightly elevated surface; used in profile.html for the passport header band. The second tonal step.
- **Archive Cream** (#F0EDE6 / oklch(95% 0.008 88)): Primary text. Warm off-white, not pure white — tinted toward the amber hue. Readable, permanent-feeling, archival.
- **Cream Mid** (#9A978F / oklch(62% 0.007 88)): Secondary text. Navigation links at rest, ghost button text, table row values, secondary labels.
- **Cream Dim** (#4A4844 / oklch(34% 0.006 89)): Tertiary text. Micro-labels, placeholder text, nav sub-labels, helper copy. Floor of legibility — nothing goes below this for meaningful content.
- **Signal Green** (#4CAF6E / oklch(68% 0.13 152)): Verified/live status only. The live indicator dot, successful terminal output lines, validated skill badges. Never used for general UI decoration.
- **Dispute Red** (#C0473A / oklch(48% 0.15 27)): Error and invalid state only. Error message backgrounds (at 7% opacity), invalid status indicators. Challenge buttons use Oracle Amber, not Dispute Red — a challenge is not destructive, it is a legitimate action.

### Named Rules
**The One Signal Rule.** Oracle Amber is used on at most 10-15% of any given screen surface. A tab, a button, an active underline, a cursor. Its scarcity is what makes it the oracle's voice.

**The Warm Void Rule.** Every neutral is tinted toward the amber hue (chroma 0.003–0.008). No pure black. No pure white. The system exists in the warmth range of near-neutral, not in the cold blue-gray default.

## 3. Typography

**Display Font:** Bebas Neue (with sans-serif fallback)
**Body/Mono Font:** Geist Mono (with monospace fallback)
**Secondary Sans:** Geist (with sans-serif fallback)

**Character:** Bebas Neue carries institutional authority — compressed, all-caps, high-contrast. Geist Mono carries machine legibility — calibrated, data-native, evenly spaced. The pairing reads as: the verdict (Bebas) and the evidence (Mono). Geist sans appears only where human-readable copy is needed; the system defaults to mono.

### Hierarchy
- **Display** (Bebas Neue, 400, clamp(2.5rem–6.25rem), line-height 0.95, letter-spacing 0.04em): Hero section headings, section titles, the oracle name. Compressed line-height creates a dense, permanent presence.
- **Headline** (Bebas Neue, 400, clamp(1.5rem–2.5rem), line-height 1, letter-spacing 0.06em): Subsection headers, feature section headings. Scaled-down display authority.
- **Stat Numbers** (Bebas Neue, 400, 2rem/32px, line-height 1): Oracle statistics, credential counts, numerical verdicts. Bebas Neue makes numbers monumental.
- **Body** (Geist Mono, 400, 0.6875rem/11px, line-height 1.7, letter-spacing 0.02em): Standard body copy, table cells, terminal output. Line-height 1.7 preserves scanability in dense data contexts. Max line length: 65–75ch.
- **Label** (Geist Mono, 400, 0.5625rem/9px, letter-spacing 0.14–0.18em, uppercase): Section tags, stat descriptors, micro-labels, column headers. All-caps with high letter-spacing creates scannable taxonomy.
- **Input** (Geist Mono, 400, 0.8125rem/13px): Form fields. Larger than body to distinguish user-entered data from system output.

### Named Rules
**The Mono Default Rule.** When in doubt, use Geist Mono. The system speaks in machine-readable formats. Geist (sans) is the exception for body paragraphs aimed at humans, not the default.

**The Scale Discipline Rule.** Never use font sizes below 9px for any text that carries meaning. Decorative labels (MRZ zone, metadata) floor at 9.5px. Critical content floors at 11px.

## 4. Elevation

This system is flat by default. No box shadows exist anywhere in the production codebase. Depth is conveyed entirely through tonal layering and border opacity, not simulated light.

The three background tones establish the elevation stack:
1. **Ground** (ink, #0C0C0A): Page plane. Negative space.
2. **Surface** (ink-surface, #111110): Cards, input backgrounds, panels. First elevation.
3. **Raised** (ink-raised, #181816): Passport header band, slightly elevated sub-surfaces. Second elevation.

Border opacity amplifies the stack. Borders at rest use the 7% rule opacity; borders on hovered or elevated containers step to 14%. The difference is subtle but perceptible.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. The only motion-based elevation is `transform: translateY(-2px)` on hover for skill cards — a whisper of lift, not a shadow. No `box-shadow` additions without explicit architectural review.

**The Tonal Stacking Rule.** Never use a darker background for a higher surface. Elevation always moves from ink (darkest) to ink-raised (lightest). Inverting this breaks the spatial logic.

## 5. Components

The component vocabulary is tight. Like a physical credentialing form: sharp edges, clear fields, stamp-ready buttons. Every component signals "this was designed for precision, not for delight."

### Buttons
- **Shape:** Zero border-radius (0px). No curves. Corners are commitments.
- **Primary:** Oracle Amber background (#E8A020), Ink text (#0C0C0A). Bebas Neue, 15px, 0.1em letter-spacing. Padding 14px 32px, minimum height 48px. Hover: opacity 0.85 (15% fade — the oracle dims slightly, it does not change color). Disabled: opacity 0.3.
- **Ghost:** Transparent background, Cream Mid text. Geist Mono, 11px, 0.08em letter-spacing. 1px solid border at rule-hi opacity (14%). Padding 11px 18px, minimum height 44px. Hover: border steps to Cream Mid, text steps to Archive Cream.
- **Link:** No background, no border. Cream Dim text. Transition to Archive Cream on hover. Used for secondary inline actions.

### Inputs / Fields
- **Style:** Ink Surface background, 1px solid rule-hi border, zero radius. Geist Mono 13px.
- **Focus:** Border shifts to Oracle Amber (#E8A020). No glow, no shadow — a clean border swap. The oracle acknowledges the query.
- **Placeholder:** Cream Dim text. Transitions away on focus.
- **Mobile:** font-size minimum 16px on mobile to prevent iOS Safari auto-zoom.

### Cards / Containers
- **Surface class:** Ink Surface background, 1px solid rule (7% opacity). The standard panel.
- **Attestation card:** Same surface treatment, 20px internal padding. Hover: border steps to rule-hi (14%). Paired with hover `translateY(-2px)` transform on skill cards.
- **Shape:** Zero radius throughout. Inner containers within cards maintain the same sharp geometry.
- **Internal Padding:** 20px standard; 24px for stat strips; 32px for modal panels.

### Tabs (`.otab`)
- Geist Mono, 10px, 0.12em letter-spacing, uppercase. Transparent background. Cream Dim text at rest.
- Active state: Oracle Amber text, 1px Oracle Amber bottom border. No background fill.
- Hover (inactive): step to Cream Mid.

### Terminal (`.term`)
- Ink background, 1px solid rule border, Geist Mono 11.5px, line-height 1.7.
- Colored output classes: `.tp` (gold = prompts), `.tok` (green = verified), `.tc` (cream-mid = comments), `.td` (cream = data), `.tw` (amber-600 = warnings).
- Line entrance animation: 0.1s opacity fade + translateY(2px). Terminal lines arrive, they do not slam.

### Ticker (Signature Component)
- Fixed bottom bar, 32px height. Nearly-opaque ink background (97%). 1px rule border top.
- Oracle Amber Bebas Neue label at left ("LIVE ATTESTATIONS"), right-bordered. Scrolling credential feed in Cream Dim Geist Mono at 11px. Animation: 55s linear infinite scroll, pauses on hover.
- The ticker is the heartbeat. It proves the system is live without requiring a scan.

### Stat Strip
- Horizontal flex container, 1px rule border as outer frame. Each stat: `border-right: 1px solid rule`. Bebas Neue 32px numbers in Archive Cream, 9px Geist Mono uppercase label in Cream Dim.

### Navigation
- Fixed top, 54px height, 92% opaque ink background, backdrop-filter blur(16px). Bottom border at rule opacity.
- Logo: Bebas Neue 18px, 0.08em spacing. Links: Geist Mono 11px, 0.1em, uppercase, Cream Dim at rest → Archive Cream on hover. Live dot: Signal Green with 2s pulse animation.

## 6. Do's and Don'ts

### Do:
- **Do** use Oracle Amber for CTAs, active states, and verification signals only. Rarity is the mechanism of trust.
- **Do** use zero border-radius on all rectangular UI elements. Curved corners belong in a different product category.
- **Do** use Bebas Neue for verdicts and names; Geist Mono for evidence and data. The pairing carries meaning.
- **Do** layer depth through background tonal steps: ink → ink-surface → ink-raised. Never shadows.
- **Do** set `font-size: 16px` minimum on form inputs in mobile breakpoints to prevent iOS Safari auto-zoom.
- **Do** use `transform: scaleX()` (not `width`) for progress bar animations to avoid layout thrash.
- **Do** keep body line-length at 65–75ch maximum. Dense mono copy needs rhythm breaks.
- **Do** floor all meaningful text at 9px. Metadata labels: 9.5–10px. Body content: 11px+.
- **Do** write copy in the oracle's voice: terse, infrastructure-confident, no hype. Precision signals trust.
- **Do** use Dispute Red (#C0473A) only for genuine error states. Oracle Amber for anything that is a legitimate user action (including challenges and disputes).

### Don't:
- **Don't** use generic crypto aesthetics: neon-on-black, laser grids, coin-ticker iconography, meme vibes. This is infrastructure, not a token launch.
- **Don't** use SaaS cream: purple gradients, Stripe-clone hero metric templates, Tailwind default color palettes, floating orbs. This is a credentialing authority, not a startup landing page.
- **Don't** use hacker terminal aesthetics: green-on-black, ASCII art as decoration, monospace as personality rather than function. The system uses mono because machines read mono, not to perform hacker identity.
- **Don't** use gradient text (`background-clip: text`). Emphasis via weight or size only.
- **Don't** use side-stripe borders (border-left > 1px as a colored accent). Use full borders, background tints, or nothing.
- **Don't** use glassmorphism decoratively. The nav blur exists for functional legibility (contrast over scrolled content), not aesthetics.
- **Don't** add box shadows. The system has no shadow vocabulary; adding one breaks the elevation contract.
- **Don't** use the hero-metric template: big number, small label, supporting stats, gradient accent. The stat strip exists but must always show real verifiable data, never marketing numbers.
- **Don't** animate CSS layout properties (width, height, padding, margin). `transform` and `opacity` only.
- **Don't** use Bebas Neue below 12px. At small sizes it loses the authority that justifies its use.
- **Don't** use color to convey challenge or dispute as "dangerous." Oracle Amber, not Dispute Red, for challenge actions. Only genuine system errors use red.
