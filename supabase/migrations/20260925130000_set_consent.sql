-- Records the caller's consent choice. A plain upsert can't be used from the app: ON CONFLICT
-- DO UPDATE would set user_id and consent_type, which users are deliberately not allowed to
-- update. This function only touches granted/version and runs as the caller, so RLS applies.
-- The consent_events trigger logs every change.
create function public.set_consent(p_type public.consent_type, p_granted boolean, p_version text)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.consents (user_id, consent_type, granted, version)
  values ((select auth.uid()), p_type, p_granted, p_version)
  on conflict (user_id, consent_type)
  do update set granted = excluded.granted, version = excluded.version;
$$;

revoke execute on function public.set_consent(public.consent_type, boolean, text) from public, anon;
grant execute on function public.set_consent(public.consent_type, boolean, text) to authenticated;
