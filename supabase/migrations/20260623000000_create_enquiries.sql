-- AI auto-quoting: store every enquiry generated on /ai-quote.html
create table if not exists public.enquiries (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  problem_text       text,
  contact_name       text,
  company            text,
  contact_phone      text,
  contact_email      text,
  classification     text,            -- 'simple' | 'complex'
  estimated_weeks    int,
  price_sgd          int,
  proposal           text,
  reasoning          text,
  before_mermaid     text,
  after_mermaid      text,
  raw_llm_json       jsonb,
  quote_requested    boolean not null default false,
  quote_requested_at timestamptz,
  user_agent         text,
  ip_hash            text             -- hashed client IP, for rate-limiting only
);

-- Fast lookups for the per-IP rate limit in the `quote` function.
create index if not exists enquiries_ip_hash_created_idx
  on public.enquiries (ip_hash, created_at desc);

-- Enable RLS with NO policies: anon/public clients get no access at all.
-- The Edge Functions use the service-role key (which bypasses RLS), so the
-- table is reachable only from trusted backend code, never from the browser.
alter table public.enquiries enable row level security;
