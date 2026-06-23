-- Split the single weeks estimate into build vs testing/deployment.
-- Price + complexity are gated on build_weeks; total_weeks is the delivery timeline.
alter table public.enquiries
  add column if not exists build_weeks int,
  add column if not exists testing_deployment_weeks int,
  add column if not exists total_weeks int;
