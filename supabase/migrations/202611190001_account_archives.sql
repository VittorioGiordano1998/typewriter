create table public.typewriter_archives (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1 check (revision > 0)
);
alter table public.typewriter_archives enable row level security;
grant select, insert, update on public.typewriter_archives to authenticated;
create policy "Users read their own archive" on public.typewriter_archives for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their own archive" on public.typewriter_archives for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their own archive" on public.typewriter_archives for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
