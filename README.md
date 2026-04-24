# Velo Working — Website v3

**Live file:** `index.html` (single file, zero build step)
**Version:** v3.0 · April 2026
**Aligned with:** Business Plan v3.0, Company Profile v3.0, Pitch Deck v3

---

## What this is

One HTML file. No build process. No framework. No dependencies except Google Fonts (loaded from CDN). Opens and works in any browser. Edits in any text editor. Deploys to any static host for free.

Everything — layout, styles, interactions — is in `index.html`.

---

## Preview locally

Just double-click `index.html`. Done.

Or, from Terminal:

```bash
# macOS
open index.html

# Or run a local server (if you want proper URLs and no file-path weirdness)
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## Deploy — pick one of these

All three are free for this site. Ranked by how friendly they are for a solo founder who just wants to ship:

### Option 1 · Cloudflare Pages ⭐ *recommended*

- Free plan is generous. No card required.
- Custom domain with free SSL in 2 minutes.
- The fastest CDN in Asia by a wide margin — matters for SG/MY visitors.
- No Git required — drag-and-drop the folder into the dashboard.

Steps:
1. Go to `https://pages.cloudflare.com` → sign in.
2. *Create a project* → *Upload assets*.
3. Drag the folder containing `index.html`.
4. Name it `veloworking` → *Deploy*.
5. Custom Domain tab → add `www.veloworking.com` → follow the DNS instructions (update your registrar to point to Cloudflare).

### Option 2 · Netlify

- Drag-and-drop the folder onto `app.netlify.com/drop`. It goes live in 10 seconds on a random subdomain.
- Add your custom domain in the site's settings.
- Free SSL auto-provisioned.

### Option 3 · Vercel

- `vercel.com/new` → drag folder → deploy.
- Same ease as Netlify. Slightly better Next.js tooling if you ever migrate.

### If you want to stay on Manus

Manus hosts static HTML. Upload `index.html` via their file manager, set it as the index, point your domain. Should work — but Cloudflare Pages will be faster in Singapore and free.

---

## Editing copy without breaking anything

All text lives between HTML tags. To change the hero headline:

```html
<!-- Find this block -->
<h1 class="reveal">
  <span class="line">Own the system</span>
  <span class="line">that runs</span>
  <span class="line">your business.</span>
  <span class="line italic-accent accent--blue">No lock-in.</span>
</h1>
```

Change the words inside the `<span>` tags. Leave the tags alone. Save. Refresh browser. Done.

The file is organised by commented sections — search for these markers:

- `NAV`
- `HERO`
- `PROBLEM — 3 pillars`
- `COMPOUND DAMAGE — reframe`
- `CONCEPT — 6 principles`
- `MODULES`
- `APPROACH — 3-step method`
- `POSITIONING`
- `PRICING`
- `MANIFESTO`
- `FINAL CTA`
- `FOOTER`

---

## Editing colours / fonts

Top of the file, inside the `:root` block:

```css
--ink: #0A0A0A;      /* primary black background */
--paper: #F7F5F0;    /* off-white text */
--blue: #1317E4;     /* accent only — italic words, CTA, numbers */
```

Do not add new colours unless the brand guidelines change. The locked palette is the site's signature.

---

## Changing the WhatsApp number

Search for `6598943004`. It appears in three places: the nav CTA, the hero CTA, and the final CTA. Replace all three.

---

## SEO checklist (already done)

- `<title>` and `<meta description>` set.
- Open Graph tags set for LinkedIn/WhatsApp previews.
- `schema.org/Organization` structured data embedded.
- Canonical URL set.
- Font loading optimised with `display=swap`.
- Favicon inline.

**Not yet set:** OG preview image (the 1200×630 card that shows when someone pastes the link into LinkedIn/WhatsApp). I'll generate one next — it should be an image at `/og-image.png` and the `og:image` meta tag points to it.

---

## Accessibility

- Semantic HTML (`<nav>`, `<section>`, `<h1>` → `<h3>`).
- Colour contrast passes WCAG AA (`--paper` on `--ink` = 17.8:1, far above 4.5:1 required).
- Respects `prefers-reduced-motion`.
- Focus states inherited from browser defaults (not overridden).
- Alt text absent because there are no content images — the only SVG is decorative.

---

## Analytics (optional)

I recommend **Plausible** (`plausible.io`) — privacy-first, GDPR-safe, no cookie banner needed for it. About S$13/month. Paste their one-line script tag just before `</head>`.

Alternative: **Cloudflare Web Analytics** — free if hosting on Cloudflare Pages. Even simpler.

Avoid GA4 unless you need ad-retargeting. It's free but bloated, slows the page, and requires a cookie banner.

---

## What's intentionally not on the site yet

- **Case studies.** None published yet. When the first Neogenius engagement completes, a dedicated `/work` route or a `Proof` section gets added.
- **Blog / journal.** Your LinkedIn is the content engine. No need for a blog until there's a critical mass of essays worth archiving.
- **Founder photo.** v3 direction is type-only. Add a photo in v4 once the site has conversion data to justify the design risk.
- **Multi-language (Chinese).** Add once Malaysia expansion is active.

---

## If something breaks

The file has zero external dependencies other than Google Fonts. If Google Fonts fails, the site falls back to system sans-serif and still reads fine — it won't look like `veloworking.com` but it will function.

No JavaScript is required for content display. If JS fails, the reveal animations are skipped and everything is shown immediately. The nav mobile toggle won't work but desktop nav does.

---

*Built 23 April 2026. Aligned with locked v3 positioning.*
