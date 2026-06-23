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

async function sendQuoteRequestEmail(d: Record<string, unknown>): Promise<void> {
  if (!RESEND_API_KEY) { console.warn("RESEND_API_KEY not set — skipping quote-request email"); return; }
  const complex = d.classification === "complex";
  const priceLine = complex
    ? "Complex — no firm price was shown"
    : `S$${Number(d.price_sgd).toLocaleString()} (${d.estimated_weeks} week(s) &times; S$1,500)`;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1d1d1f;max-width:640px;line-height:1.5">
    <div style="background:#0071e3;color:#fff;padding:14px 18px;border-radius:12px;margin-bottom:18px">
      <b style="font-size:16px">⚡ Official quotation requested — follow up</b>
    </div>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:18px">
      <tr><td style="padding:3px 14px 3px 0;color:#6e6e73">Name</td><td><b>${esc(d.contact_name)}</b></td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#6e6e73">Company</td><td>${esc(d.company)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#6e6e73">Phone</td><td>${esc(d.contact_phone)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#6e6e73">Email</td><td>${esc(d.contact_email)}</td></tr>
    </table>
    <p style="margin:0 0 4px"><b>Classification:</b> ${esc(d.classification)}</p>
    <p style="margin:0 0 16px"><b>Indicative estimate shown:</b> ${priceLine}</p>
    <h3 style="margin:0 0 6px">Original problem</h3>
    <p style="white-space:pre-wrap;margin:0 0 16px">${esc(d.problem_text)}</p>
    <h3 style="margin:0 0 6px">Proposal summary</h3>
    <p style="margin:0 0 16px">${esc(d.proposal).replace(/\n/g, "<br>")}</p>
    <p style="color:#86868b;font-size:12px;margin-top:18px">Enquiry id: ${esc(d.id) || "not saved"}</p>
  </div>`;
  const body: Record<string, unknown> = {
    from: FROM_EMAIL,
    to: NOTIFY_EMAILS,
    subject: `⚡ OFFICIAL QUOTE REQUESTED — ${esc(d.contact_name) || "anonymous"}${d.company ? " (" + esc(d.company) + ")" : ""} — ${complex ? "complex" : "S$" + Number(d.price_sgd).toLocaleString()}`,
    html,
  };
  if (d.contact_email) body.reply_to = String(d.contact_email);
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

  // Fall back to the client snapshot if the row wasn't found.
  const d = row ?? {
    id: enquiryId,
    contact_name: snap.name, company: snap.company, contact_phone: snap.phone, contact_email: snap.email,
    problem_text: snap.problem, classification: snap.classification,
    estimated_weeks: snap.weeks, price_sgd: snap.price, proposal: snap.proposal,
  };

  await sendQuoteRequestEmail(d).catch((e) => console.error("quote-request email error", e));
  return json({ ok: true }, 200, origin);
});
