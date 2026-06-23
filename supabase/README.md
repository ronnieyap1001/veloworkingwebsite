# AI auto-quoting backend

Backend for `/ai-quote.html`. Runs on the existing **"Veloworking website"** Supabase
project (`uenbnsnafnxyqqtbmmzh`).

## Pieces

| Piece | What it does |
|---|---|
| `migrations/20260623000000_create_enquiries.sql` | `enquiries` table — logs every submission |
| `functions/quote` | Validates the lead form, rate-limits per IP, calls Claude for a structured proposal, computes price + complexity **server-side**, logs the enquiry, emails Ronnie (Email 1) |
| `functions/request-quote` | Marks the enquiry as `quote_requested` and emails Ronnie a higher-priority alert (Email 2) |

The browser only ever holds the **public publishable key** and the function URL
(`https://uenbnsnafnxyqqtbmmzh.supabase.co/functions/v1/...`). All real secrets stay
on the server.

## One-time setup

### 1. Restore the project
The project pauses on the free tier. Restore it (Supabase dashboard → project → *Restore*,
or `supabase projects ...`).

### 2. Set the function secrets
Dashboard → **Project Settings → Edge Functions → Secrets** (or `supabase secrets set`):

| Secret | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | **yes** | Your Claude key. Without it the function returns 503. |
| `RESEND_API_KEY` | for email | From resend.com. Without it, enquiries are still logged + returned, but no email is sent. |
| `NOTIFY_EMAILS` | optional | Comma list. Defaults to `ronnie.yap@veloworking.com,ronnieyap1001@gmail.com`. |
| `FROM_EMAIL` | optional | Defaults to `Velo Working <quotes@veloworking.com>` — must be on a Resend-verified domain. |
| `ALLOWED_ORIGINS` | optional | Defaults to `https://www.veloworking.com,https://veloworking.com`. |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do **not** set them.

### 3. Verify the email domain in Resend
To email arbitrary inboxes (both Ronnie addresses), add `veloworking.com` in Resend and
publish the DKIM/SPF DNS records it gives you. Until then, Resend test mode only delivers
to your own Resend-account address.

## Deploy

**Via Supabase CLI:**
```bash
supabase link --project-ref uenbnsnafnxyqqtbmmzh
supabase db push                       # applies the migration
supabase functions deploy quote
supabase functions deploy request-quote
```
(`verify_jwt = false` is already set per-function in `config.toml`.)

**Or via the MCP tools** (`apply_migration`, `deploy_edge_function` with `verify_jwt:false`).

## Pricing / classification rules (enforced in `functions/quote/index.ts`)
- 1 **build** week = **S$1,500**; `price_sgd = build_weeks × 1500`. Build time = requirement understanding (~1–2 days) + development only — it **excludes** testing & deployment.
- `total_weeks = build_weeks + testing_deployment_weeks` is shown to the visitor as the delivery timeline but is **not** billed.
- **Complex** if `build_weeks > 4` **or** a genuine external third-party system must be connected **or** it is more than a single module → no firm price, visitor routed to WhatsApp.
- Otherwise **simple** → price shown + "Request for official quotation" button.
- The system prompt teaches the model Jodoo's **built-in** capabilities (QR/barcode scanning, e-signature, approvals, automations, dashboards, PDF, data linking, etc.) so they are **not** mistaken for external-API work. `requires_external_api` is true only when connecting Jodoo to a separate outside system (Shopify, Xero, payment gateway, SMS/WhatsApp gateway, custom system…).
- The model proposes the inputs; the **server** does the maths and the final classification.
