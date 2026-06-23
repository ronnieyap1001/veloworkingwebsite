// Edge Function: quote
// Generates an AI proposal + indicative price for a visitor's operational
// problem, logs the enquiry, and emails Ronnie a notification.
//
// Secrets / env expected on the Supabase project:
//   ANTHROPIC_API_KEY   (required)  - server-side Claude key
//   RESEND_API_KEY      (optional)  - if unset, email is skipped (enquiry still logged + returned)
//   NOTIFY_EMAILS       (optional)  - comma list; defaults below
//   FROM_EMAIL          (optional)  - verified Resend sender; defaults below
//   ALLOWED_ORIGINS     (optional)  - comma list; defaults below
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  - injected automatically by Supabase
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const NOTIFY_EMAILS = (Deno.env.get("NOTIFY_EMAILS") ??
  "ronnie.yap@veloworking.com,ronnieyap1001@gmail.com")
  .split(",").map((s) => s.trim()).filter(Boolean);
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "Velo Working <quotes@veloworking.com>";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://www.veloworking.com,https://veloworking.com")
  .split(",").map((s) => s.trim());

const WEEK_RATE_SGD = 1500;
const MODEL = "claude-sonnet-4-6"; // richer reasoning for proposals + workflow quality
const RATE_LIMIT = 5;                       // max enquiries...
const RATE_WINDOW_MS = 60 * 60 * 1000;      // ...per hour, per hashed IP

// Free / personal webmail providers are rejected — we want a real work email.
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.com.sg",
  "ymail.com", "hotmail.com", "hotmail.co.uk", "outlook.com", "outlook.sg",
  "live.com", "live.com.sg", "msn.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "gmx.com", "gmx.net", "proton.me", "protonmail.com", "pm.me",
  "zoho.com", "yandex.com", "mail.com", "qq.com", "163.com", "126.com",
]);

const SYSTEM_PROMPT =
`You are the auto-quoting assistant for Velo Working, run by Ronnie Yap — an independent operations engineer who builds simple, modular business systems for SMEs in Singapore, Malaysia and Brunei on JODOO, a no-code platform. A visitor describes an operational problem or requirement. Your job is to propose the SIMPLEST viable solution — an MVP — that Ronnie can auto-quote, classify the job, and estimate the build time. Always answer by calling the submit_quote tool.

SOLUTION APPROACH — MVP FIRST (most important):
- Do NOT design a perfect or complete system. Propose a minimum viable product: the smallest single Jodoo module that delivers the core value and fits within auto-quote capability (one module, no external system, build_weeks of 4 or fewer).
- If the request is vague or under-specified, DO NOT ask the visitor to clarify and do not inflate scope to cover every edge case. Instead MAKE sensible assumptions and decide the scope yourself on the requestor's behalf so the solution stays simple — and record those decisions in the assumptions field.
- Prefer cutting scope (fewer fields, one workflow path, manual handling of edge cases) over adding complexity. Classify a job as complex ONLY if even a sensibly cut-down MVP genuinely cannot be a single module, needs an external third-party system, or still takes more than 4 build weeks.
- After the MVP, use beyond_mvp to describe how a fuller or "perfect" solution could extend it later, and/or the key open questions you still have about the requirement.

WHAT JODOO DOES OUT OF THE BOX (no coding, NO external API needed) — treat ALL of these as standard, low-effort building blocks, never as reasons a project is complex:
- Forms: drag-and-drop builder, 20+ field types, subforms/tables, conditional show-hide logic, formulas and calculations, aggregate tables, photo upload, e-signature capture, custom buttons, custom result pages.
- Data views: grid, kanban, gallery, gantt, calendar.
- QR codes and barcodes: generate a shareable form QR code, AND scan barcodes/QR codes directly from the Jodoo mobile app (e.g. inventory, assets, equipment inspection). This is BUILT IN — it does NOT require any external API.
- Workflow and approvals: visual process designer, multi-level approvals, countersign, return/transfer, CC nodes, comments, auto-submit/return.
- Automation: trigger actions on record create/update/delete, scheduled tasks, automated notifications and reminders, document/PDF generation.
- Dashboards and reports: many chart types, gantt, calendar, KPI dashboards, conditional formatting, export to PDF/Excel, embed.
- Data linking: connect/associate data between forms, pull data across apps in the same account (cross-app), change history, recycle bin, import/export.
- Mobile: native iOS and Android apps. Plus roles, permissions, SSO and audit trail.

WHAT COUNTS AS AN EXTERNAL API CONNECTION (only THIS makes a project complex): connecting Jodoo to a SEPARATE third-party system — e.g. Shopify, Xero or other accounting/ERP, a payment gateway, a government/tax portal, an SMS or WhatsApp gateway, a custom in-house system, or any two-way sync with software outside Jodoo (via Jodoo's open API, webhooks, Zapier/Make or custom plugins). Anything that is built into Jodoo (QR/barcode scanning, e-signature, notifications, PDF generation, dashboards, approvals, data linking within Jodoo) is NOT an external API connection. Set requires_external_api true ONLY when a separate outside system must be connected.

TIME ESTIMATE — estimate in whole weeks and SEPARATE build time from testing/deployment:
- build_weeks = requirement understanding + development/configuration ONLY. The client already states their requirement in the form and the modules are simple, so requirement understanding should take only about 1-2 days — do not over-estimate it. build_weeks does NOT include testing or deployment.
- testing_deployment_weeks = user testing, fixes and go-live AFTER the build. Estimate separately; it is NOT part of build time.

COMPLEXITY — judge ONLY on build time and scope, NEVER on testing/deployment:
- A job is COMPLEX if ANY of these are true: build_weeks is greater than 4; requires_external_api is true; or it is more than a single module.
- Otherwise it is SIMPLE (clear request, linear workflow, single Jodoo module, no external system, build_weeks of 4 or fewer).
- For COMPLEX jobs: keep the proposal high-level, say a detailed scope discussion is needed, and do not promise a firm price.

Solution workflow (after_workflow_mermaid) — this is the key visual, put real thought into it:
- Show the NEW end-to-end process once the Jodoo module is live: the actual steps, who does each one, and the key automations/decision points — specific to THIS visitor's problem and expectation, not generic.
- Make it genuinely useful: 6 to 10 nodes. Use a clear linear or branching flow. You MAY use decision diamonds, e.g. C{Approved} --> |Yes| D[...] and C --> |No| E[...].
- Valid Mermaid "flowchart TD" syntax. Inside node labels use ONLY plain ASCII letters, numbers and spaces — no parentheses, quotes, colons, slashes, ampersands or other punctuation, which break rendering.
- Keep EVERY node label SHORT: at most 4 words / about 22 characters, so the text fits inside the box and never clips. If a step needs more detail, split it into two nodes rather than writing a long label. Prefer who-does-what verbs, e.g. Staff scans QR, Jodoo logs entry, Manager approves, Auto weekly report.
- Example shape: flowchart TD; A[Staff scans QR] --> B[Jodoo logs entry] --> C{Within limit} --> |Yes| D[Auto approve] --> F[Dashboard updates]; C --> |No| E[Manager reviews] --> F

proposal: the MVP solution only — 2 to 4 short plain-text paragraphs, no markdown headings, for a non-technical SME owner. Describe the single Jodoo module and the specific Jodoo capabilities you would use. Keep it minimal.
assumptions: the decisions and assumptions you made on the requestor's behalf to keep the solution simple, especially where the request was unclear. If the request was fully clear, write exactly "None — your request was clear enough to scope directly."
beyond_mvp: how a fuller or "perfect" solution could extend the MVP later, and/or the main open questions you would want the requestor to answer. 1 to 3 short sentences, plain text.
complexity_reasoning: 1 to 2 sentences explaining the classification, including the build time and whether any external system is involved.`;

const TOOL = {
  name: "submit_quote",
  description: "Return the structured proposal, workflow diagrams and complexity assessment.",
  input_schema: {
    type: "object",
    properties: {
      classification: { type: "string", enum: ["simple", "complex"] },
      build_weeks: { type: "integer", minimum: 1, description: "Requirement understanding (1-2 days) + development only. Excludes testing/deployment." },
      testing_deployment_weeks: { type: "integer", minimum: 0, description: "User testing, fixes and go-live after the build. Not part of build time." },
      requires_external_api: { type: "boolean", description: "True ONLY if a separate third-party system outside Jodoo must be connected." },
      is_single_module: { type: "boolean" },
      complexity_reasoning: { type: "string" },
      proposal: { type: "string", description: "The MVP solution only — the smallest single Jodoo module that delivers the core value." },
      assumptions: { type: "string", description: "Scoping decisions/assumptions made on the requestor's behalf. 'None — your request was clear enough to scope directly.' if fully clear." },
      beyond_mvp: { type: "string", description: "How a fuller/perfect solution could extend the MVP later, and/or open questions for the requestor." },
      after_workflow_mermaid: { type: "string", description: "The detailed solution workflow as Mermaid 'flowchart TD'. 6-10 nodes, short labels (<=4 words)." },
    },
    required: [
      "classification", "build_weeks", "testing_deployment_weeks", "requires_external_api",
      "is_single_module", "complexity_reasoning", "proposal", "assumptions", "beyond_mvp",
      "after_workflow_mermaid",
    ],
  },
};

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, apikey, authorization, x-client-info",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidWorkEmail(email: string): boolean {
  const m = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(email.trim().toLowerCase());
  if (!m) return false;
  return !FREE_EMAIL_DOMAINS.has(m[1]);
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}

async function sendEnquiryEmail(d: Record<string, unknown>): Promise<void> {
  if (!RESEND_API_KEY) { console.warn("RESEND_API_KEY not set — skipping enquiry email"); return; }
  const complex = d.classification === "complex";
  const priceLine = complex
    ? "Complex — no firm price (visitor routed to WhatsApp)"
    : `S$${Number(d.price_sgd).toLocaleString()} — ${d.build_weeks} build week(s) &times; S$1,500. Estimated delivery ~${d.total_weeks} week(s) (incl. ${d.testing_deployment_weeks} for testing &amp; deployment).`;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1d1d1f;max-width:640px;line-height:1.5">
    <h2 style="margin:0 0 2px">New AI enquiry</h2>
    <p style="color:#6e6e73;margin:0 0 18px;font-size:13px">${esc(new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" }))} (SGT)</p>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:18px">
      <tr><td style="padding:3px 14px 3px 0;color:#6e6e73">Name</td><td><b>${esc(d.contact_name)}</b></td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#6e6e73">Company</td><td>${esc(d.company)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#6e6e73">Phone</td><td>${esc(d.contact_phone)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#6e6e73">Email</td><td>${esc(d.contact_email)}</td></tr>
    </table>
    <p style="margin:0 0 4px"><b>Classification:</b> ${esc(d.classification)}</p>
    <p style="margin:0 0 16px"><b>Estimate:</b> ${priceLine}</p>
    <h3 style="margin:0 0 6px">Problem</h3>
    <p style="white-space:pre-wrap;margin:0 0 16px">${esc(d.problem_text)}</p>
    ${d.expectation ? `<h3 style="margin:0 0 6px">Expectation</h3><p style="white-space:pre-wrap;margin:0 0 16px">${esc(d.expectation)}</p>` : ""}
    <h3 style="margin:0 0 6px">MVP proposal</h3>
    <p style="margin:0 0 16px">${esc(d.proposal).replace(/\n/g, "<br>")}</p>
    ${d.assumptions ? `<h3 style="margin:0 0 6px">Assumptions made</h3><p style="margin:0 0 16px">${esc(d.assumptions).replace(/\n/g, "<br>")}</p>` : ""}
    ${d.beyond_mvp ? `<h3 style="margin:0 0 6px">Beyond the MVP / open questions</h3><p style="margin:0 0 16px">${esc(d.beyond_mvp).replace(/\n/g, "<br>")}</p>` : ""}
    <p style="margin:0 0 16px"><b>Why this classification:</b> ${esc(d.reasoning)}</p>
    <h3 style="margin:0 0 6px">Solution workflow (Mermaid)</h3>
    <pre style="background:#f5f5f7;padding:12px;border-radius:8px;white-space:pre-wrap;font-size:13px">${esc(d.after_mermaid)}</pre>
    <p style="color:#86868b;font-size:12px;margin-top:18px">Enquiry id: ${esc(d.id) || "not saved"}</p>
  </div>`;
  const body: Record<string, unknown> = {
    from: FROM_EMAIL,
    to: NOTIFY_EMAILS,
    subject: `New AI enquiry — ${complex ? "complex" : "simple"} — ${complex ? "WhatsApp" : "S$" + Number(d.price_sgd).toLocaleString()}`,
    html,
  };
  if (d.contact_email) body.reply_to = d.contact_email;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.error("Resend error", r.status, await r.text());
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }

  const problem = String(payload.problem ?? "").trim();
  const expectation = String(payload.expectation ?? "").trim();
  const name = String(payload.name ?? "").trim();
  const company = String(payload.company ?? "").trim();
  const phone = String(payload.phone ?? "").trim();
  const email = String(payload.email ?? "").trim();

  // Lead-capture gate (mirrors the client-side validation, enforced server-side).
  if (!name || !company || !phone || !email || !problem || !expectation)
    return json({ error: "Please complete all fields." }, 400, origin);
  if (problem.length > 4000 || expectation.length > 4000)
    return json({ error: "Please shorten your description (4000 characters max)." }, 400, origin);
  if (!isValidWorkEmail(email))
    return json({ error: "Please use your work email — Gmail, Yahoo, Hotmail, Outlook and similar personal addresses are not accepted." }, 400, origin);

  // Per-IP rate limit.
  const ipRaw = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = await sha256("velo-quote-salt::" + ipRaw);
  const ua = req.headers.get("user-agent") ?? "";
  if (SUPABASE_URL && SERVICE_ROLE) {
    try {
      const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/enquiries?ip_hash=eq.${ipHash}&created_at=gte.${encodeURIComponent(since)}&select=id`,
        { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
      );
      if (r.ok) {
        const rows = await r.json();
        if (Array.isArray(rows) && rows.length >= RATE_LIMIT)
          return json({ error: "You've made several requests recently. Please WhatsApp Ronnie directly, or try again later." }, 429, origin);
      }
    } catch (e) { console.error("rate-limit check failed", e); }
  }

  if (!ANTHROPIC_API_KEY)
    return json({ error: "The AI is not configured yet. Please WhatsApp Ronnie." }, 503, origin);

  // Ask Claude for a structured proposal via forced tool use.
  let t: Record<string, unknown>;
  try {
    const ar = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1300,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "submit_quote" },
        messages: [{
          role: "user",
          content: `Visitor name: ${name}\nCompany: ${company}\n\nProblem (current pain):\n${problem}\n\nExpectation (what they want the solution to do):\n${expectation}`,
        }],
      }),
    });
    if (!ar.ok) {
      console.error("Anthropic error", ar.status, await ar.text());
      return json({ error: "The AI is busy right now. Please try again in a moment, or WhatsApp Ronnie." }, 502, origin);
    }
    const data = await ar.json();
    const block = (data.content ?? []).find((c: Record<string, unknown>) => c.type === "tool_use");
    if (!block) return json({ error: "Could not generate a proposal. Please WhatsApp Ronnie." }, 502, origin);
    t = block.input as Record<string, unknown>;
  } catch (e) {
    console.error("Anthropic request failed", e);
    return json({ error: "The AI request failed. Please WhatsApp Ronnie." }, 502, origin);
  }

  // Pricing & classification are decided server-side — never trust the model to compute.
  // Price and complexity are gated on BUILD time only (excludes testing/deployment).
  const buildWeeks = Math.max(1, parseInt(String(t.build_weeks), 10) || 1);
  const tdWeeks = Math.max(0, parseInt(String(t.testing_deployment_weeks), 10) || 0);
  const totalWeeks = buildWeeks + tdWeeks;
  const requiresApi = t.requires_external_api === true;
  const singleModule = t.is_single_module !== false;
  const isComplex = buildWeeks > 4 || requiresApi || !singleModule;
  const classification = isComplex ? "complex" : "simple";
  const price = buildWeeks * WEEK_RATE_SGD;

  const record = {
    problem_text: problem, expectation, contact_name: name, company, contact_phone: phone, contact_email: email,
    classification,
    build_weeks: buildWeeks, testing_deployment_weeks: tdWeeks, total_weeks: totalWeeks,
    estimated_weeks: buildWeeks, // kept in sync with the billed (build) weeks for continuity
    price_sgd: price,
    proposal: String(t.proposal ?? ""), reasoning: String(t.complexity_reasoning ?? ""),
    assumptions: String(t.assumptions ?? ""), beyond_mvp: String(t.beyond_mvp ?? ""),
    after_mermaid: String(t.after_workflow_mermaid ?? ""),
    raw_llm_json: t, user_agent: ua, ip_hash: ipHash,
  };

  // Log the enquiry (best effort) and capture the row id.
  let enquiryId: string | null = null;
  if (SUPABASE_URL && SERVICE_ROLE) {
    try {
      const ins = await fetch(`${SUPABASE_URL}/rest/v1/enquiries`, {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json", Prefer: "return=representation",
        },
        body: JSON.stringify(record),
      });
      if (ins.ok) { const rows = await ins.json(); enquiryId = rows?.[0]?.id ?? null; }
      else console.error("enquiry insert failed", ins.status, await ins.text());
    } catch (e) { console.error("enquiry insert error", e); }
  }

  // Email 1 — notify on every submission (best effort; never blocks the response).
  await sendEnquiryEmail({ ...record, id: enquiryId }).catch((e) => console.error("enquiry email error", e));

  return json({
    enquiryId,
    classification,
    proposal: record.proposal,
    assumptions: record.assumptions,
    beyond_mvp: record.beyond_mvp,
    complexity_reasoning: record.reasoning,
    after_workflow_mermaid: record.after_mermaid,
    build_weeks: buildWeeks,
    testing_deployment_weeks: tdWeeks,
    total_weeks: totalWeeks,
    price_sgd: price,
  }, 200, origin);
});
