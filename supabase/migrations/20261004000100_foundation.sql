-- Phase 0 only. Identity and library tables are introduced by later backlog tasks.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- New public objects require explicit grants. Never auto-expose application tables.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

create or replace function public.foundation_version()
returns text
language sql stable security invoker
set search_path = ''
as $$ select 'seen-foundation-v1'::text $$;
revoke all on function public.foundation_version() from public, anon;
grant execute on function public.foundation_version() to authenticated;
