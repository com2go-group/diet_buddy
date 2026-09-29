-- Admins can give Premium through RevenueCat (admin-users → grant_premium / revoke_premium); each
-- change is in the audit log with its duration, reason and outcome. The user detail shows that
-- history so support can see why someone has Premium. No new personal data: the entries already
-- live in admin_audit_log.
create or replace function public.admin_user_detail(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.require_admin('support');
  perform public.log_admin_action('view_user', p_user::text, '{}');
  select jsonb_build_object(
    'user_id', u.id, 'email', u.email, 'phone', u.phone, 'created_at', u.created_at,
    'last_sign_in_at', u.last_sign_in_at, 'banned', coalesce(u.banned_until > now(), false),
    'name', p.name, 'units', p.units, 'is_premium', coalesce(p.is_premium, false),
    'xp', p.xp, 'streak_days', p.streak_days, 'onboarded', p.onboarding_completed_at,
    'admin_role', (select role from public.admin_users where user_id = u.id),
    'counts', jsonb_build_object(
      'food_logs', (select count(*) from public.food_logs where user_id = u.id),
      'checkins', (select count(*) from public.checkins where user_id = u.id),
      'coach_messages', (select count(*) from public.coach_messages where user_id = u.id),
      'progress_photos', (select count(*) from public.progress_photos where user_id = u.id),
      'safety_events', (select count(*) from public.safety_events where user_id = u.id)
    ),
    'consents', coalesce((select jsonb_object_agg(consent_type, granted) from public.consents where user_id = u.id), '{}'),
    'premium_grants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'action', a.action, 'details', a.details, 'created_at', a.created_at,
        'admin_email', (select email from auth.users where id = a.admin_id)
      ) order by a.created_at desc)
      from public.admin_audit_log a
      where a.target = u.id::text and a.action in ('grant_premium', 'revoke_premium')
    ), '[]'),
    'tickets', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'subject', subject, 'status', status, 'created_at', created_at) order by created_at desc) from public.support_tickets where user_id = u.id), '[]')
  ) into result
  from auth.users u left join public.profiles p on p.user_id = u.id
  where u.id = p_user;
  return result;
end;
$$;
