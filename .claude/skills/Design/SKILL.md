---
name: Design
description: Velo Working's Apple-inspired design system. Use whenever building, editing, or reviewing any user-facing surface in this repo — landing pages, sub-pages (assessment, pitch deck, blog), email templates, OG images, or new UI tiles. Invoke when the user says "/Design", asks for a "redesign", "make it look like Apple", "make it on-brand", "new section", "new page", or anything about layout, type, colour, spacing, or component styling. Skip for backend, copywriting-only, or non-visual edits.
---

# Velo Working — Design System

The site's visual language. Apple.com-inspired tile bento on an off-white surface, with one strategic accent: the Jodoo partnership.

When in doubt: **white space, oversized type, hairline rules, big rounded tiles, restraint with colour.** If a section feels noisy, delete an element.

---

## 1 · Brand stance

| Pillar | What it means in the UI |
|---|---|
| **Engineered** | No decorative gradients on body sections. Geometry is honest — flat tiles, hairline borders, no fake depth. |
| **Owned by your team** | Plain language. No marketing fluff. Headlines should sound like a person, not a brochure. |
| **Engineered with Jodoo** | The partnership is the *only* surface that uses gradient + dark backdrop. Treat it as the hero "product tile". Never repeat that treatment elsewhere — it dilutes. |

---

## 2 · Tokens (canonical — match `index.html` `:root`)

```css
--bg:        #fbfbfd;   /* page */
--surface:   #ffffff;   /* white tile */
--surface-2: #f5f5f7;   /* gray tile */
--ink:       #1d1d1f;   /* primary text */
--ink-2:     #6e6e73;   /* secondary text */
--ink-3:     #86868b;   /* footer / fine print */
--rule:      #d2d2d7;   /* hairlines */
--dark:      #0b0b0d;   /* dark tile */
--link:      #0071e3;   /* Apple link blue — primary CTA */
--link-hov:  #0077ed;
--jodoo:     #1317E4;   /* preserved Velo brand blue — partner tile only */

--r-tile:    24px;      /* large tiles */
--r-pill:    980px;     /* buttons, chips */
```

**Rules**
- Do not introduce new colours. If you need emphasis, use weight or scale, not hue.
- The Jodoo blue (`--jodoo`) appears only inside the partner tile gradient and the footer partner chip.
- Backgrounds alternate `--bg` (page) / `--surface` (white tile) / `--surface-2` (gray tile). Never mix all three in one section.

---

## 3 · Typography

Stack: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Arial, sans-serif`.

- Body: 17px / 1.47 / `-0.022em`, weight 400.
- Headings: weight **600** (semibold), letter-spacing **-0.04em**, line-height ~1.05. Apple never uses 700+ on display type.
- Scale (clamp-based, fluid): `h1 40→80px`, `h2 32→56px`, `h3 22→32px`, lead `19→22px`.
- Eyebrows: 14px, weight 600, `--link` colour, sits 12–14px above the heading. No uppercase.

**Don'ts**
- No serif. No italic for emphasis on body. (The Jodoo word in the hero gradient is an exception, styled `font-style: normal`.)
- No all-caps headlines. The only uppercase allowed is the 11px partner-chip tag (`letter-spacing: 0.14em`).
- Do not bold body copy for emphasis — restructure the sentence.

---

## 4 · Layout

- Wrap: `max-width: 1180px`, gutter `clamp(20px, 4vw, 40px)`.
- Section vertical pad: `clamp(48px, 6vw, 80px)`.
- Hero & flagship tiles can grow to `clamp(72px, 9vw, 120px)`.
- Tile gap (the gutter between adjacent tiles in a bento row): **12px**. Always 12px — this is the "Apple bento" tell.

### Section header pattern (centered)
```html
<div class="section__head">
  <div class="eyebrow">Eyebrow</div>
  <h2>One sentence headline.</h2>
  <p>Optional 1–2 sentence intro, max ~20 words.</p>
</div>
```

### Tile patterns
- `tile` — white, 24px radius, padding `clamp(40px, 5vw, 64px)`.
- `tile tile--gray` — gray surface variant.
- `tile tile--dark` — dark obsidian, body text becomes `rgba(245,245,247,0.72)`.
- `tile tile--center` — centered text, used sparingly (final CTA, reframe).
- `tile tile--media` — zero padding wrapper for full-bleed tiles like the Jodoo flagship.

### Grid presets
- `.grid` → 2 columns, stacks at `≤833px`.
- `.grid--three` → 3 columns, stacks at `≤833px`.
- `.grid--single` → 1 column (used for full-bleed flagship tiles).

---

## 5 · Components

### Buttons
Two only. Never invent a third.
- `.btn.btn--primary` — filled `--link` blue, white text, pill, 12px × 22px.
- `.btn.btn--ghost` — outline `--link`, fills on hover.
- On dark tiles: add `.btn--on-dark` so ghost variants flip to `#2997ff` (Apple's "blue on dark").

### Inline link with chevron
```html
<a class="link" href="…">Learn more</a>
```
Auto-renders the `›` chevron via `::after`. Use for tertiary CTAs alongside a button.

### Eyebrow (section / tile label)
14px semibold, `--link`. On dark tiles use `#2997ff`.

### Hairline rules
1px `--rule` only. Never use shadows for separation.

### Numbers / counters
- Pillar/step numbers use `--link` blue, weight 600, 13px (in body) or 56px gradient (`--link → #5e5ce6`) for the step display.
- Module list uses 13px blue numbers in a 36px column.

---

## 6 · The Jodoo partnership rule

The partnership is the **only** place these are allowed:
1. A multi-stop gradient (`--link → #5e5ce6 → --jodoo`) on the word "Jodoo" or "business".
2. A dark `linear-gradient(180deg, #0b0b0d, #1c1c40)` background with a `radial-gradient` "spotlight" from top.
3. A frosted glass chip: `background: rgba(255,255,255,0.06); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.14)`.
4. The `partner-hero__stats` 4-up grid with hairline dividers using `gap: 1px; background: rgba(255,255,255,0.12)`.

If a new section needs to "feel important", make it bigger or quieter — don't reuse this treatment. Reusing it dilutes the partner's primacy.

The Jodoo logo: always `asset/jodoo_logo.png`, height 16–30px depending on context, with `filter: brightness(0) invert(1)` only on dark surfaces.

---

## 7 · Motion

- Single utility: `.reveal` → fades + 16px translate, 700ms ease, fires via `IntersectionObserver` at `threshold: 0.12, rootMargin: '0px 0px -40px 0px'`.
- Buttons: 200ms ease on background/colour. No transforms on click.
- Respect `prefers-reduced-motion: reduce` — disable transitions and `scroll-behavior`.
- Do not animate on hover beyond opacity/colour. No "lift" shadows.

---

## 8 · Nav & footer

**Nav** — fixed, 48px tall, frosted (`backdrop-filter: saturate(180%) blur(20px)`), `rgba(251,251,253,0.72)` background, 1px bottom hairline. Links 12px, weight 400, with one `--link`-coloured accent ("Jodoo Partner"). Mobile breakpoint `≤833px` → hamburger drawer.

**Footer** — `--surface-2` background, 12px text, multi-column (4 on desktop, 2 on mobile). Always carries a partner callout chip directly under the top hairline: "Engineered with [Jodoo logo] · Asia's leading no-code workflow platform".

---

## 9 · Copy patterns

- Hero structure: 2-line h1 → 1-line h2 sub → 1-line lede → CTAs → partner chip.
- Section heads: eyebrow (2–4 words) → h2 (≤10 words) → optional intro (≤25 words).
- Tiles: `tile__eyebrow` → `tile__title` (1 sentence) → `tile__sub` (1–2 sentences) → optional `link`.
- Use sentence case for headlines, **not** Title Case. Apple does this.
- End headlines with a period when the sentence is complete. Skip the period for fragments / labels.

---

## 10 · Accessibility & SEO non-negotiables

- Semantic landmarks: `<nav>`, `<main>`, `<section>`, `<footer>`. One `<h1>` per page (the hero).
- `<title>` and `<meta description>` updated on every new page.
- OG tags: `og:title`, `og:description`, `og:type`, `og:url`, `og:site_name`.
- `schema.org/Organization` JSON-LD on the homepage; `Article` on blog pages.
- Colour contrast: body `--ink` on `--bg` is 16.7:1 — passes AA/AAA. Don't drop body to `--ink-3` on `--bg` (only ~4.0:1; reserve for fine print).
- Every interactive element must be reachable by keyboard. Don't override `:focus-visible`.

---

## 11 · File & build constraints

- The site is intentionally **single-file, zero-build** (`index.html` carries everything). Sub-pages follow the same convention. Don't introduce a bundler, framework, or external CSS file.
- One Google Fonts request (`Inter`). Don't add more font families. SF Pro is loaded via the system stack — Inter is the cross-platform fallback.
- No JS frameworks. Vanilla only. The IntersectionObserver reveal pattern is the entire JS surface area; reuse it.
- Inline SVGs for marks. Raster only when unavoidable (the Jodoo logo is the sole `<img>` aside from OG).

---

## 12 · Working checklist

When building or reviewing a UI change, verify in this order:

1. **Tokens** — only `:root` colours used? No new hex values?
2. **Type** — semibold not bold, sentence case, eyebrow above every section head?
3. **Spacing** — section pad and 12px tile gap? `--gut` for horizontal padding?
4. **Tiles** — 24px radius, one of the three surface variants, no shadows?
5. **CTAs** — two buttons or fewer per section, `.link` used for tertiary?
6. **Partnership** — gradient/dark treatment confined to the Jodoo tile and hero word?
7. **Motion** — only `.reveal` and 200ms button transitions? `prefers-reduced-motion` respected?
8. **A11y** — landmarks, single h1, contrast, focus order?
9. **Footprint** — no new dependencies, fonts, frameworks?
10. **Mobile** — 833px breakpoint stacks correctly, nav drawer works, type still readable?

If any item fails, fix it before considering the change done.
