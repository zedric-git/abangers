-- Grant base table privileges to the Postgres roles Supabase's API uses.
--
-- 0001_init.sql defined RLS policies for profiles/listings but never granted
-- the underlying table privileges those roles need to touch the tables at
-- all -- RLS restricts rows a role *can* see once it has access, it doesn't
-- grant access by itself. Without this, every request from the anon/
-- authenticated roles (i.e. every request the app makes) fails with
-- "permission denied for table ..." (Postgres error 42501), regardless of
-- how correct the RLS policies are. This is what caused new sign-ups to
-- never produce a profiles row.
--
-- Privileges below are scoped to exactly match each table's existing RLS
-- policies (see 0001_init.sql) -- e.g. no delete grant on profiles, since
-- there's no delete policy for it.

grant select, insert, update on public.profiles to authenticated;

grant select on public.listings to anon;
grant select, insert, update, delete on public.listings to authenticated;
