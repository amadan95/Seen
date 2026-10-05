begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users(id, email) values
  ('10000000-0000-4000-8000-000000000001', 'owner@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'stranger@example.invalid'),
  ('10000000-0000-4000-8000-000000000003', 'restricted@example.invalid');

select ok(not has_schema_privilege('authenticated', 'private', 'usage'), 'private schema remains inaccessible');
select ok(not has_table_privilege('anon', 'public.profiles', 'select'), 'anonymous cannot read raw profiles');
select ok(not has_table_privilege('anon', 'public.user_settings', 'select'), 'anonymous cannot read settings');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'update'), 'direct identity writes denied');
select ok(not has_table_privilege('authenticated', 'public.user_settings', 'update'), 'direct settings writes denied');
select ok(not has_function_privilege('anon', 'public.bootstrap_profile(text,text)', 'execute'), 'bootstrap requires authentication');
select ok(not has_schema_privilege('seen_identity_owner', 'public', 'create'), 'RPC owner cannot create public objects');
select ok(not (select rolcanlogin or rolsuper or rolbypassrls from pg_roles where rolname = 'seen_identity_owner'), 'definer role cannot log in or bypass RLS');

set local role authenticated;
select throws_ok($$select public.bootstrap_profile('owner', 'Owner')$$, '42501', null, 'missing actor rejected');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((public.bootstrap_profile('Owner_Name', ' Owner ')).username, 'owner_name', 'username normalized and display trimmed');
select is((public.bootstrap_profile('different', 'Changed')).version, 1::bigint, 'bootstrap retry does not change identity/version');
select is((select count(*) from public.profiles), 1::bigint, 'one owner profile');
select is((select count(*) from public.user_settings), 1::bigint, 'one settings row');
select is((select visibility from public.profiles), 'private', 'profile private by default');
select ok((select history_visibility = 'private' and watchlist_visibility = 'private' and not analytics_opt_in and not collaborative_opt_in and not ai_opt_in from public.user_settings), 'content defaults private and optional processing off');
select is((select onboarding_step from public.user_settings), 'region', 'setup resumes at region checkpoint');
select throws_ok($$update public.profiles set account_state = 'active'$$, '42501', null, 'client cannot change account state');
select throws_ok($$insert into public.profiles(user_id, username, display_name) values ('10000000-0000-4000-8000-000000000002', 'hijack', 'Hijack')$$, '42501', null, 'client cannot create identity for another actor');
select throws_ok($$select public.update_own_profile(1, 'x', 'Owner', '', 'private')$$, '23514', null, 'short username rejected');
select throws_ok($$select public.update_own_profile(1, 'bad.name', 'Owner', '', 'private')$$, '23514', null, 'username character allowlist enforced');
select throws_ok($$select public.update_own_profile(1, 'owner_name', 'Owner', repeat('x',161), 'private')$$, '23514', null, 'bio bounded');
select is((public.update_own_profile(1, 'owner_name', 'Owner', '', 'private')).version, 1::bigint, 'unchanged profile does not increment version');
select is((public.update_own_profile(1, 'owner_name', 'Owner', 'My bio', 'public')).version, 2::bigint, 'accepted profile change increments version');
select throws_ok($$select public.update_own_profile(1, 'owner_name', 'Owner', '', 'private')$$, 'P0001', 'CONFLICT', 'stale profile version rejected');
select throws_ok($$select public.update_own_settings(1, 'XX', 'en-US', 'private', 'private', false, false, false, 'region')$$, '23503', null, 'unsupported region rejected');
select is((public.update_own_settings(1, 'US', 'en-US', 'private', 'private', false, false, false, 'region')).version, 1::bigint, 'settings no-op preserves version');
select is((public.update_own_settings(1, 'US', 'en-US', 'friends', 'private', false, false, false, 'complete')).version, 2::bigint, 'checkpoint and privacy change saved together');
select ok((select onboarding_completed_at is not null from public.user_settings), 'completion timestamp persisted');
select throws_ok($$select public.update_own_settings(1, 'US', 'en-US', 'public', 'private', false, false, false, 'complete')$$, 'P0001', 'CONFLICT', 'stale settings update rejected');
select throws_ok($$select public.update_own_settings(2, 'US', 'en-US', 'friends', 'private', false, false, false, 'region')$$, '22023', 'ONBOARDING_ALREADY_COMPLETE', 'completed setup cannot regress');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.profiles), 0::bigint, 'stranger cannot read even a public raw profile');
select is((select count(*) from public.user_settings), 0::bigint, 'stranger cannot read owner settings');
select throws_ok($$select public.bootstrap_profile('OWNER_NAME', 'Stranger')$$, '23505', null, 'uppercase cannot bypass username uniqueness');
select is((select count(*) from public.user_settings), 0::bigint, 'failed bootstrap leaves no partial settings');
select lives_ok($$select public.bootstrap_profile('stranger', 'Stranger')$$, 'stranger can bootstrap own account');
select is((select count(*) from public.profiles), 1::bigint, 'stranger sees only own identity');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select lives_ok($$select public.bootstrap_profile('restricted', 'Restricted')$$, 'restriction fixture created');

reset role;
select is((select count(*) from private.user_preference_state), 3::bigint, 'preference state bootstrapped once per owner');
select is((select visibility_revision from private.user_preference_state where user_id = '10000000-0000-4000-8000-000000000001'), 2::bigint, 'acknowledged privacy changes advance invalidation revision');
update public.profiles set account_state = 'suspended' where user_id = '10000000-0000-4000-8000-000000000003';
set local role authenticated;
select throws_ok($$select public.bootstrap_profile('restricted', 'Restricted')$$, '42501', 'ACCOUNT_UNAVAILABLE', 'bootstrap cannot reactivate restricted account');
select throws_ok($$select public.update_own_profile(1, 'restricted', 'Restricted', '', 'private')$$, '42501', 'ACCOUNT_UNAVAILABLE', 'restricted account profile writes denied');
select throws_ok($$select public.update_own_settings(1, 'US', 'en-US', 'private', 'private', false, false, false, 'region')$$, '42501', 'ACCOUNT_UNAVAILABLE', 'restricted account settings writes denied');
reset role;
set local role anon;
select throws_ok($$select * from public.user_settings$$, '42501', null, 'actual anonymous settings read denied');
select throws_ok($$select * from public.profiles$$, '42501', null, 'actual anonymous raw identity read denied');
reset role;
select * from finish();
rollback;
