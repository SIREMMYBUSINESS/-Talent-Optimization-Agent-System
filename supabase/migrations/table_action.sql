-- Create table if it doesn't exist
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid,
  job_id uuid,
  status text check (status in ('applied','screening','interview','offer','rejected')),
  created_at timestamp with time zone default now()
);

-- Optional helpful indexes
create index if not exists applications_created_at_idx on public.applications (created_at desc);
create index if not exists applications_status_idx on public.applications (status);
