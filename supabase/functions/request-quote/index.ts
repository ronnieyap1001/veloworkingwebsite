// Edge Function: request-quote
// Fired when a visitor clicks "Request for official quotation". Marks the
// logged enquiry as quote_requested and emails Ronnie a distinct, higher-
// priority alert. Falls back to a client-provided snapshot if the row can't
// be found (e.g. the original insert failed) so the alert still goes out.
//
// Secrets / env: RESEND_API_KEY, NOTIFY_EMAILS, FROM_EMAIL, ALLOWED_ORIGINS,
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (last two injected automatically).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}

// Normalise a field to string[] — accepts an array (snapshot) or a list-string (DB row).
function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  const s = String(v ?? "").trim();
  if (!s || /^none\b/i.test(s)) return [];
  return s.split(/\r?\n+/).map((x) => x.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, "").trim()).filter(Boolean);
}
function bulletHtml(items: string[]): string {
  if (!items.length) return "";
  return `<ul style="margin:0 0 16px;padding-left:20px">${items.map((i) => `<li style="margin-bottom:4px">${esc(i)}</li>`).join("")}</ul>`;
}
function stepsHtml(steps: string[]): string {
  if (!steps.length) return "";
  return `<ol style="margin:0 0 16px;padding-left:22px">${steps.map((s) => `<li style="margin-bottom:4px">${esc(s)}</li>`).join("")}</ol>`;
}

// `v` is a normalised view of exactly what the page showed (built from the snapshot,
// with the DB row as a fallback) — so this email mirrors the website result + Email 1.
async function sendQuoteRequestEmail(v: Record<string, unknown>): Promise<void> {
  if (!RESEND_API_KEY) { console.warn("RESEND_API_KEY not set — skipping quote-request email"); return; }
  const complex = v.classification === "complex";
  const buildW = v.buildWeeks ?? "?";
  const totalW = v.totalWeeks ?? v.buildWeeks ?? "?";
  const tdW = v.tdWeeks ?? 0;
  const priceLine = complex
    ? "Complex — no firm price was shown (routed to WhatsApp)"
    : `S$${Number(v.price).toLocaleString()} — ${buildW} build week(s) &times; S$1,500. Estimated delivery ~${totalW} week(s) (incl. ${tdW} for testing &amp; deployment).`;
  const assumptions = asArray(v.assumptions);
  const clarification = asArray(v.clarification);
  const steps = asArray(v.workflow_steps);
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1d1d1f;max-width:640px;line-height:1.5">
    <div style="background:#0071e3;color:#fff;padding:14px 18px;border-radius:12px;margin-bottom:18px">
      <b style="font-size:16px">⚡ Official quotation requested — follow up</b>
    </div>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:18px">
      <tr><td style="padding:3px 14px 3px 0;color:#6e6e73">Name</td><td><b>${esc(v.name)}</b></td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#6e6e73">Company</td><td>${esc(v.company)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#6e6e73">Phone</td><td>${esc(v.phone)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#6e6e73">Email</td><td>${esc(v.email)}</td></tr>
    </table>
    <p style="margin:0 0 4px"><b>Classification:</b> ${esc(v.classification)}</p>
    <p style="margin:0 0 16px"><b>Estimate shown:</b> ${priceLine}</p>
    <h3 style="margin:0 0 6px">Problem</h3>
    <p style="white-space:pre-wrap;margin:0 0 16px">${esc(v.problem)}</p>
    ${v.expectation ? `<h3 style="margin:0 0 6px">Expectation</h3><p style="white-space:pre-wrap;margin:0 0 16px">${esc(v.expectation)}</p>` : ""}
    ${assumptions.length ? `<h3 style="margin:0 0 6px">Assumptions</h3>${bulletHtml(assumptions)}` : ""}
    <h3 style="margin:0 0 6px">Proposal</h3>
    <p style="margin:0 0 12px">${esc(v.proposal).replace(/\n/g, "<br>")}</p>
    ${steps.length ? `<h4 style="margin:0 0 4px;font-size:14px">Solution workflow</h4>${stepsHtml(steps)}` : ""}
    ${clarification.length ? `<h3 style="margin:0 0 6px">Clarification</h3>${bulletHtml(clarification)}` : ""}
    ${v.reasoning ? `<p style="margin:0 0 16px"><b>Why this classification:</b> ${esc(v.reasoning)}</p>` : ""}
    <p style="color:#86868b;font-size:12px;margin-top:18px">Enquiry id: ${esc(v.id) || "not saved"}</p>
  </div>`;
  const body: Record<string, unknown> = {
    from: FROM_EMAIL,
    to: NOTIFY_EMAILS,
    subject: `⚡ OFFICIAL QUOTE REQUESTED — ${esc(v.name) || "anonymous"}${v.company ? " (" + esc(v.company) + ")" : ""} — ${complex ? "complex" : "S$" + Number(v.price).toLocaleString()}`,
    html,
  };
  if (v.email) body.reply_to = String(v.email);
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

  const enquiryId = payload.enquiryId ? String(payload.enquiryId) : "";
  const snap = (payload.snapshot ?? {}) as Record<string, unknown>;

  // Authoritative path: mark the stored enquiry and email from the DB row.
  let row: Record<string, unknown> | null = null;
  if (enquiryId && SUPABASE_URL && SERVICE_ROLE) {
    try {
      const upd = await fetch(`${SUPABASE_URL}/rest/v1/enquiries?id=eq.${encodeURIComponent(enquiryId)}`, {
        method: "PATCH",
        headers: {
          apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json", Prefer: "return=representation",
        },
        body: JSON.stringify({ quote_requested: true, quote_requested_at: new Date().toISOString() }),
      });
      if (upd.ok) { const rows = await upd.json(); row = rows?.[0] ?? null; }
      else console.error("quote-request update failed", upd.status, await upd.text());
    } catch (e) { console.error("quote-request update error", e); }
  }

  // Build a view from the snapshot (exactly what the page showed) so the email
  // matches the website; fall back to the DB row field-by-field where missing.
  const r = (row ?? {}) as Record<string, unknown>;
  const pick = (a: unknown, b: unknown) => (a !== undefined && a !== null && a !== "" ? a : b);
  const view: Record<string, unknown> = {
    id: enquiryId || r.id || "",
    name: pick(snap.name, r.contact_name),
    company: pick(snap.company, r.company),
    phone: pick(snap.phone, r.contact_phone),
    email: pick(snap.email, r.contact_email),
    problem: pick(snap.problem, r.problem_text),
    expectation: pick(snap.expectation, r.expectation),
    classification: pick(snap.classification, r.classification),
    buildWeeks: pick(snap.buildWeeks, pick(r.build_weeks, r.estimated_weeks)),
    tdWeeks: pick(snap.tdWeeks, r.testing_deployment_weeks),
    totalWeeks: pick(snap.totalWeeks, r.total_weeks),
    price: pick(snap.price, r.price_sgd),
    proposal: pick(snap.proposal, r.proposal),
    assumptions: pick(snap.assumptions, r.assumptions),       // array (snapshot) or list-string (row)
    clarification: pick(snap.clarification, r.beyond_mvp),
    workflow_steps: pick(snap.workflow_steps, r.after_mermaid), // array (snapshot) or numbered string (row)
    reasoning: pick(snap.reasoning, r.reasoning),
  };

  await sendQuoteRequestEmail(view).catch((e) => console.error("quote-request email error", e));
  return json({ ok: true }, 200, origin);
});
