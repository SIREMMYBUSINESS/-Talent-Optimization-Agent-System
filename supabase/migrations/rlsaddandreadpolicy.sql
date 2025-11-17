alter table public.applications enable row level security;

-- Allow read for any authenticated user
create policy applications_read_authenticated
on public.applications
for select
to authenticated
using (true);
