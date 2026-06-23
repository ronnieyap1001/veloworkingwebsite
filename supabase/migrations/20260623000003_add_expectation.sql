-- Two-part requirement capture: store the visitor's expected outcome alongside
-- their current-pain problem statement.
alter table public.enquiries
  add column if not exists expectation text;
