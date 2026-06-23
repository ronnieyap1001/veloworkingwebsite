-- Capture the MVP-first analysis: scoping assumptions and the fuller-solution /
-- open-questions notes the AI produces alongside the MVP proposal.
alter table public.enquiries
  add column if not exists assumptions text,
  add column if not exists beyond_mvp text;
