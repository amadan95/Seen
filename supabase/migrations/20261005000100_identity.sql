-- Task 02. Raw identity/settings are owner-only; other-user projections come later.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'seen_identity_owner') then
    create role seen_identity_owner nologin noinherit;
  end if;
end $$;
-- Supabase's migration role is not a superuser. Transfer ownership through an explicit
-- SET membership; retain administration but disable SET/INHERIT after the transfer.
grant seen_identity_owner to postgres with set true, inherit false;
grant usage on schema public, private to seen_identity_owner;
-- The managed auth schema cannot be re-granted by the migration role. This tiny
-- helper reads only verified request claims, with no tables or caller actor parameter.
create function private.verified_actor() returns uuid
language sql stable security definer set search_path = '' as $$ select auth.uid() $$;
revoke all on function private.verified_actor() from public, anon, authenticated;
grant execute on function private.verified_actor() to seen_identity_owner;

create table private.supported_regions (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  default_locale text not null check (length(default_locale) between 2 and 35)
);
insert into private.supported_regions values ('US', 'en-US');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (length(display_name) between 1 and 50 and display_name = btrim(display_name)),
  bio text not null default '' check (length(bio) <= 160),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  account_state text not null default 'active' check (account_state in ('active', 'suspended', 'deletion_pending', 'deleted')),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_ci on public.profiles (lower(username));
create index profiles_username_prefix on public.profiles (username text_pattern_ops);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  region text not null default 'US' references private.supported_regions(code),
  locale text not null default 'en-US' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  history_visibility text not null default 'private' check (history_visibility in ('private', 'friends', 'public')),
  watchlist_visibility text not null default 'private' check (watchlist_visibility in ('private', 'friends', 'public')),
  analytics_opt_in boolean not null default false,
  collaborative_opt_in boolean not null default false,
  ai_opt_in boolean not null default false,
  onboarding_step text not null default 'region' check (onboarding_step in ('region', 'providers', 'taste', 'compare', 'complete')),
  onboarding_completed_at timestamptz,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((onboarding_step = 'complete') = (onboarding_completed_at is not null))
);

create table private.user_preference_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preference_revision bigint not null default 0 check (preference_revision >= 0),
  provider_revision bigint not null default 0 check (provider_revision >= 0),
  visibility_revision bigint not null default 0 check (visibility_revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on public.profiles, public.user_settings from public, anon, authenticated;
revoke all on private.supported_regions, private.user_preference_state from public, anon, authenticated;
grant select on public.profiles, public.user_settings to authenticated;
grant select, insert, update on public.profiles, public.user_settings, private.user_preference_state to seen_identity_owner;
grant select on private.supported_regions to seen_identity_owner;

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table private.user_preference_state enable row level security;
create policy profiles_owner_read on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy settings_owner_read on public.user_settings for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_rpc_owner on public.profiles to seen_identity_owner using (user_id = (select private.verified_actor())) with check (user_id = (select private.verified_actor()));
create policy settings_rpc_owner on public.user_settings to seen_identity_owner using (user_id = (select private.verified_actor())) with check (user_id = (select private.verified_actor()));
create policy preferences_rpc_owner on private.user_preference_state to seen_identity_owner using (user_id = (select private.verified_actor())) with check (user_id = (select private.verified_actor()));

create function private.touch_identity_row() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_identity_row();
create trigger settings_touch before update on public.user_settings for each row execute function private.touch_identity_row();
create trigger preferences_touch before update on private.user_preference_state for each row execute function private.touch_identity_row();

-- Only the narrow definer role can call this helper; clients cannot access private.
create function private.require_active_actor() returns uuid
language plpgsql security invoker set search_path = '' as $$
declare actor uuid := private.verified_actor();
begin
  if actor is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where user_id = actor and account_state = 'active') then
    raise exception 'ACCOUNT_UNAVAILABLE' using errcode = '42501';
  end if;
  return actor;
end $$;
revoke all on function private.require_active_actor(), private.touch_identity_row() from public, anon, authenticated;
grant execute on function private.require_active_actor(), private.touch_identity_row() to seen_identity_owner;

create function public.bootstrap_profile(p_username text, p_display_name text)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.verified_actor(); existing public.profiles; result public.profiles;
begin
  if actor is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  -- Serializes first-login retries for this actor. No client-supplied actor ID exists.
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  select * into existing from public.profiles where user_id = actor;
  if found then
    if existing.account_state <> 'active' then raise exception 'ACCOUNT_UNAVAILABLE' using errcode = '42501'; end if;
    return existing;
  end if;
  insert into public.profiles(user_id, username, display_name)
    values (actor, lower(btrim(p_username)), btrim(p_display_name)) returning * into result;
  insert into public.user_settings(user_id) values (actor);
  insert into private.user_preference_state(user_id) values (actor);
  return result;
end $$;

create function public.update_own_profile(p_base_version bigint, p_username text, p_display_name text, p_bio text, p_visibility text)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare actor uuid; previous public.profiles; result public.profiles;
begin
  actor := private.require_active_actor();
  select * into previous from public.profiles where user_id = actor for update;
  if previous.account_state <> 'active' then raise exception 'ACCOUNT_UNAVAILABLE' using errcode = '42501'; end if;
  if p_base_version is distinct from previous.version then raise exception 'CONFLICT' using errcode = 'P0001'; end if;
  if previous.username = lower(btrim(p_username)) and previous.display_name = btrim(p_display_name)
    and previous.bio = p_bio and previous.visibility = p_visibility then return previous; end if;
  update public.profiles set username = lower(btrim(p_username)), display_name = btrim(p_display_name),
    bio = p_bio, visibility = p_visibility, version = version + 1 where user_id = actor returning * into result;
  if previous.visibility <> result.visibility then
    update private.user_preference_state set visibility_revision = visibility_revision + 1 where user_id = actor;
  end if;
  return result;
end $$;

create function public.update_own_settings(
  p_base_version bigint, p_region text, p_locale text, p_history_visibility text,
  p_watchlist_visibility text, p_analytics_opt_in boolean, p_collaborative_opt_in boolean,
  p_ai_opt_in boolean, p_onboarding_step text
) returns public.user_settings language plpgsql security definer set search_path = '' as $$
declare actor uuid; previous public.user_settings; result public.user_settings;
begin
  actor := private.require_active_actor();
  -- Hold the account row while writing, so a concurrent restriction cannot race this command.
  perform 1 from public.profiles where user_id = actor and account_state = 'active' for update;
  if not found then raise exception 'ACCOUNT_UNAVAILABLE' using errcode = '42501'; end if;
  select * into previous from public.user_settings where user_id = actor for update;
  if p_base_version is distinct from previous.version then raise exception 'CONFLICT' using errcode = 'P0001'; end if;
  if previous.onboarding_step = 'complete' and p_onboarding_step <> 'complete' then
    raise exception 'ONBOARDING_ALREADY_COMPLETE' using errcode = '22023';
  end if;
  if (previous.region, previous.locale, previous.history_visibility, previous.watchlist_visibility,
      previous.analytics_opt_in, previous.collaborative_opt_in, previous.ai_opt_in, previous.onboarding_step)
    is not distinct from (p_region, p_locale, p_history_visibility, p_watchlist_visibility,
      p_analytics_opt_in, p_collaborative_opt_in, p_ai_opt_in, p_onboarding_step) then return previous; end if;
  update public.user_settings set region = p_region, locale = p_locale,
    history_visibility = p_history_visibility, watchlist_visibility = p_watchlist_visibility,
    analytics_opt_in = p_analytics_opt_in, collaborative_opt_in = p_collaborative_opt_in,
    ai_opt_in = p_ai_opt_in, onboarding_step = p_onboarding_step,
    onboarding_completed_at = case when p_onboarding_step = 'complete' then coalesce(onboarding_completed_at, now()) else null end,
    version = version + 1 where user_id = actor returning * into result;
  if (previous.history_visibility, previous.watchlist_visibility) is distinct from (result.history_visibility, result.watchlist_visibility) then
    update private.user_preference_state set visibility_revision = visibility_revision + 1 where user_id = actor;
  end if;
  if previous.region <> result.region then
    update private.user_preference_state set provider_revision = provider_revision + 1 where user_id = actor;
  end if;
  return result;
end $$;

grant create on schema public to seen_identity_owner;
alter function public.bootstrap_profile(text, text) owner to seen_identity_owner;
alter function public.update_own_profile(bigint, text, text, text, text) owner to seen_identity_owner;
alter function public.update_own_settings(bigint, text, text, text, text, boolean, boolean, boolean, text) owner to seen_identity_owner;
revoke create on schema public from seen_identity_owner;
-- Apply ACLs as the actual owner, before disabling the migration role's SET ability.
set local role seen_identity_owner;
revoke all on function public.bootstrap_profile(text, text), public.update_own_profile(bigint, text, text, text, text),
  public.update_own_settings(bigint, text, text, text, text, boolean, boolean, boolean, text) from public, anon;
grant execute on function public.bootstrap_profile(text, text), public.update_own_profile(bigint, text, text, text, text),
  public.update_own_settings(bigint, text, text, text, text, boolean, boolean, boolean, text) to authenticated;
reset role;
grant seen_identity_owner to postgres with set false, inherit false;
