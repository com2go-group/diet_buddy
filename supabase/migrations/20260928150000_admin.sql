-- Admin dashboard (Phase 4, decision log 2026-09-28): admins only, with two-factor sign-in.
-- Every admin read and write goes through security-definer functions that check the caller's
-- role AND that the session is MFA-verified (aal2); admin writes are recorded in an audit log.
-- No pay codes and no price editing (store consoles handle those).

create type public.admin_role as enum ('support', 'admin', 'owner');

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.admin_role not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.admin_users
  for each row execute function public.set_updated_at();
alter table public.admin_users enable row level security;
grant select on public.admin_users to authenticated;
create policy "own row: select" on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  target text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index admin_audit_created on public.admin_audit_log (created_at desc);
alter table public.admin_audit_log enable row level security;

-- Coach safety flags (metadata only: which flag, which persona, when; never message content).
create table public.safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  persona public.coach_persona not null,
  flag text not null check (flag in ('disordered_eating', 'crisis', 'medical')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index safety_events_open on public.safety_events (created_at desc) where reviewed_at is null;
create trigger set_updated_at before update on public.safety_events
  for each row execute function public.set_updated_at();
alter table public.safety_events enable row level security;
grant select on public.safety_events to authenticated;
create policy "own rows: select" on public.safety_events for select to authenticated
  using (user_id = (select auth.uid()));

-- Support requests from Profile → Help.
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 120),
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  reply text check (char_length(reply) <= 4000),
  replied_at timestamptz,
  replied_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_status on public.support_tickets (status, created_at desc);
create trigger set_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();
alter table public.support_tickets enable row level security;
grant select, insert (subject, message) on public.support_tickets to authenticated;
create policy "own rows: select" on public.support_tickets for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.support_tickets for insert to authenticated
  with check (user_id = (select auth.uid()));

-- FAQ shown in Profile → Help, edited in the dashboard.
create table public.faq_entries (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 3 and 200),
  answer text not null check (char_length(answer) between 1 and 2000),
  sort integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.faq_entries
  for each row execute function public.set_updated_at();
alter table public.faq_entries enable row level security;
grant select on public.faq_entries to authenticated;
create policy "published: read" on public.faq_entries for select to authenticated using (published);

-- ─── access checks ───────────────────────────────────────────────────────────

/** The caller's admin role, only when the session passed two-factor sign-in (aal2). */
create function public.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = ''
as $$
  select a.role from public.admin_users a
  where a.user_id = auth.uid()
    and coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal', '') = 'aal2';
$$;

create function public.require_admin(min_role public.admin_role)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r public.admin_role := public.current_admin_role();
begin
  if r is null or r < min_role then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

create function public.log_admin_action(p_action text, p_target text, p_details jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (admin_id, action, target, details)
  values (auth.uid(), p_action, p_target, coalesce(p_details, '{}'));
$$;

/** For the dashboard gate: is this user an admin, and is the session MFA-verified? */
create function public.admin_me()
returns table (role public.admin_role, mfa_verified boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select a.role,
         coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal', '') = 'aal2'
  from public.admin_users a where a.user_id = auth.uid();
$$;

-- ─── overview ────────────────────────────────────────────────────────────────

create function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  prices jsonb := coalesce((select value from public.app_config where key = 'ai_prices'), '{}');
  month_start timestamptz := date_trunc('month', now());
  result jsonb;
begin
  perform public.require_admin('support');
  select jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'users_30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'onboarded', (select count(*) from public.profiles where onboarding_completed_at is not null),
    'premium', (select count(*) from public.profiles where is_premium),
    'active_today', (select count(distinct user_id) from public.food_logs where logged_at > now() - interval '1 day'),
    'active_7d', (select count(distinct user_id) from public.food_logs where logged_at > now() - interval '7 days'),
    'open_tickets', (select count(*) from public.support_tickets where status = 'open'),
    'open_safety', (select count(*) from public.safety_events where reviewed_at is null),
    'ai_month', coalesce((
      select jsonb_agg(jsonb_build_object(
        'function', f.function_name, 'model', f.model, 'calls', f.calls,
        'input_tokens', f.input_tokens, 'output_tokens', f.output_tokens,
        'cost_usd', round((
          f.input_tokens * coalesce((prices -> f.model ->> 'input')::numeric, 0)
          + f.output_tokens * coalesce((prices -> f.model ->> 'output')::numeric, 0)
        ) / 1000000, 2)
      ) order by f.function_name)
      from (
        select function_name, model, count(*) as calls,
               sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens
        from public.ai_usage where created_at >= month_start
        group by function_name, model
      ) f
    ), '[]'),
    'ai_budget_usd', (select value from public.app_config where key = 'ai_monthly_budget_usd')
  ) into result;
  return result;
end;
$$;

-- ─── users ───────────────────────────────────────────────────────────────────

create function public.admin_list_users(p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns table (
  user_id uuid, email text, phone text, name text, created_at timestamptz,
  last_sign_in_at timestamptz, is_premium boolean, onboarded boolean, xp integer,
  streak_days integer, banned boolean, admin_role public.admin_role
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin('support');
  return query
    select u.id, u.email::text, u.phone::text, p.name, u.created_at, u.last_sign_in_at,
           coalesce(p.is_premium, false), p.onboarding_completed_at is not null,
           coalesce(p.xp, 0), coalesce(p.streak_days, 0),
           coalesce(u.banned_until > now(), false), a.role
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.admin_users a on a.user_id = u.id
    where p_search is null or p_search = ''
       or u.email ilike '%' || p_search || '%'
       or u.phone ilike '%' || p_search || '%'
       or p.name ilike '%' || p_search || '%'
       or u.id::text = p_search
    order by u.created_at desc
    limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end;
$$;

create function public.admin_user_detail(p_user uuid)
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
    'tickets', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'subject', subject, 'status', status, 'created_at', created_at) order by created_at desc) from public.support_tickets where user_id = u.id), '[]')
  ) into result
  from auth.users u left join public.profiles p on p.user_id = u.id
  where u.id = p_user;
  return result;
end;
$$;

create function public.admin_set_role(p_user uuid, p_role public.admin_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin('owner');
  if p_user = auth.uid() then
    raise exception 'owners cannot change their own role' using errcode = '42501';
  end if;
  if p_role is null then
    delete from public.admin_users where user_id = p_user;
  else
    insert into public.admin_users (user_id, role, created_by) values (p_user, p_role, auth.uid())
    on conflict (user_id) do update set role = excluded.role;
  end if;
  perform public.log_admin_action('set_role', p_user::text, jsonb_build_object('role', p_role));
end;
$$;

-- ─── settings (app_config) ───────────────────────────────────────────────────

create function public.admin_list_config()
returns setof public.app_config
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin('support');
  return query select * from public.app_config order by key;
end;
$$;

/** Only known keys, each validated, so a typo can't break the app or the functions. */
create function public.admin_set_config(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := jsonb_typeof(p_value);
begin
  perform public.require_admin('admin');
  if p_key in ('coach_daily_message_limit_free', 'food_photo_daily_limit_free') then
    if t <> 'number' or (p_value #>> '{}')::numeric < 0 or (p_value #>> '{}')::numeric > 1000
       or (p_value #>> '{}')::numeric <> floor((p_value #>> '{}')::numeric) then
      raise exception 'a whole number from 0 to 1000 is required' using errcode = '22023';
    end if;
  elsif p_key = 'ai_monthly_budget_usd' then
    if not (t = 'null' or (t = 'number' and (p_value #>> '{}')::numeric >= 0)) then
      raise exception 'a positive amount or null (no cap) is required' using errcode = '22023';
    end if;
  elsif p_key = 'ai_prices' then
    if t <> 'object' then
      raise exception 'an object of model prices is required' using errcode = '22023';
    end if;
  elsif p_key = 'sms_provider' then
    if t <> 'string' or (p_value #>> '{}') not in ('smsto') then
      raise exception 'unsupported SMS provider' using errcode = '22023';
    end if;
  elsif p_key = 'sms_sender_id' then
    if t <> 'string' or (p_value #>> '{}') !~ '^[A-Za-z0-9 ]{1,11}$' then
      raise exception 'sender ID: up to 11 letters or digits' using errcode = '22023';
    end if;
  elsif p_key = 'min_app_version' then
    if t <> 'string' or (p_value #>> '{}') !~ '^\d+\.\d+\.\d+$' then
      raise exception 'a version like 1.2.0 is required' using errcode = '22023';
    end if;
  elsif p_key ~ '^feature_[a-z_]{2,40}$' then
    if t <> 'boolean' then
      raise exception 'feature switches are true or false' using errcode = '22023';
    end if;
  else
    raise exception 'unknown setting %', p_key using errcode = '22023';
  end if;
  insert into public.app_config (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value;
  perform public.log_admin_action('set_config', p_key, jsonb_build_object('value', p_value));
end;
$$;

-- ─── content ─────────────────────────────────────────────────────────────────

create function public.admin_update_achievement(
  p_code text, p_title text, p_description text, p_emoji text, p_xp integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin('admin');
  if p_xp < 0 or p_xp > 1000 or char_length(p_title) not between 1 and 60
     or char_length(p_description) not between 1 and 200 then
    raise exception 'invalid achievement' using errcode = '22023';
  end if;
  update public.achievements
  set title = p_title, description = p_description, emoji = p_emoji, xp_reward = p_xp
  where code = p_code;
  if not found then
    raise exception 'unknown achievement %', p_code using errcode = '22023';
  end if;
  perform public.log_admin_action('update_achievement', p_code,
    jsonb_build_object('title', p_title, 'xp', p_xp));
end;
$$;

create function public.admin_list_faq()
returns setof public.faq_entries
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin('support');
  return query select * from public.faq_entries order by sort, created_at;
end;
$$;

create function public.admin_save_faq(
  p_id uuid, p_question text, p_answer text, p_sort integer, p_published boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved uuid;
begin
  perform public.require_admin('admin');
  if p_id is null then
    insert into public.faq_entries (question, answer, sort, published)
    values (p_question, p_answer, p_sort, p_published) returning id into saved;
  else
    update public.faq_entries
    set question = p_question, answer = p_answer, sort = p_sort, published = p_published
    where id = p_id returning id into saved;
  end if;
  perform public.log_admin_action('save_faq', saved::text, jsonb_build_object('question', p_question));
  return saved;
end;
$$;

create function public.admin_delete_faq(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin('admin');
  delete from public.faq_entries where id = p_id;
  perform public.log_admin_action('delete_faq', p_id::text, '{}');
end;
$$;

-- ─── support ─────────────────────────────────────────────────────────────────

create function public.admin_list_tickets(p_status text default 'open')
returns table (
  id uuid, user_id uuid, email text, subject text, message text, status text,
  reply text, created_at timestamptz, replied_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin('support');
  return query
    select t.id, t.user_id, u.email::text, t.subject, t.message, t.status, t.reply,
           t.created_at, t.replied_at
    from public.support_tickets t join auth.users u on u.id = t.user_id
    where p_status is null or t.status = p_status
    order by t.created_at desc limit 200;
end;
$$;

/** Saves the reply and tells the user in the app (and by push, through push-dispatch). */
create function public.admin_reply_ticket(p_id uuid, p_reply text, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  perform public.require_admin('support');
  if p_status not in ('answered', 'closed') then
    raise exception 'status must be answered or closed' using errcode = '22023';
  end if;
  update public.support_tickets
  set reply = nullif(trim(p_reply), ''), status = p_status,
      replied_at = case when nullif(trim(p_reply), '') is not null then now() else replied_at end,
      replied_by = auth.uid()
  where id = p_id returning user_id into owner;
  if owner is null then
    raise exception 'unknown ticket' using errcode = '22023';
  end if;
  if nullif(trim(p_reply), '') is not null then
    insert into public.notifications (user_id, type, title, body)
    values (owner, 'support', '💬 Reply from DietBuddy support', left(p_reply, 500));
  end if;
  perform public.log_admin_action('reply_ticket', p_id::text, jsonb_build_object('status', p_status));
end;
$$;

-- ─── safety ──────────────────────────────────────────────────────────────────

create function public.admin_list_safety_events(p_open_only boolean default true)
returns table (
  id uuid, user_id uuid, email text, persona public.coach_persona, flag text,
  created_at timestamptz, reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin('support');
  return query
    select s.id, s.user_id, u.email::text, s.persona, s.flag, s.created_at, s.reviewed_at
    from public.safety_events s join auth.users u on u.id = s.user_id
    where not p_open_only or s.reviewed_at is null
    order by s.created_at desc limit 200;
end;
$$;

create function public.admin_review_safety_event(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin('support');
  update public.safety_events set reviewed_at = now(), reviewed_by = auth.uid() where id = p_id;
  perform public.log_admin_action('review_safety_event', p_id::text, '{}');
end;
$$;

-- ─── push campaigns ──────────────────────────────────────────────────────────

/** Promotions go only to users who gave marketing consent; push-dispatch sends them. */
create function public.admin_send_campaign(p_title text, p_body text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  sent integer;
begin
  perform public.require_admin('admin');
  if char_length(trim(p_title)) not between 3 and 80 or char_length(coalesce(p_body, '')) > 300 then
    raise exception 'title 3–80 characters, message up to 300' using errcode = '22023';
  end if;
  insert into public.notifications (user_id, type, title, body)
  select c.user_id, 'promotion', trim(p_title), nullif(trim(p_body), '')
  from public.consents c
  where c.consent_type = 'marketing' and c.granted;
  get diagnostics sent = row_count;
  perform public.log_admin_action('send_campaign', null,
    jsonb_build_object('title', p_title, 'recipients', sent));
  return sent;
end;
$$;

create function public.admin_audit(p_limit integer default 100)
returns table (
  id uuid, admin_email text, action text, target text, details jsonb, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin('admin');
  return query
    select l.id, u.email::text, l.action, l.target, l.details, l.created_at
    from public.admin_audit_log l left join auth.users u on u.id = l.admin_id
    order by l.created_at desc limit least(greatest(p_limit, 1), 500);
end;
$$;

-- Only the dashboard entry points are callable; the helpers stay internal.
revoke all on function public.require_admin(public.admin_role) from public, anon, authenticated;
revoke all on function public.log_admin_action(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.current_admin_role() from public, anon;
do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_me()', 'admin_stats()', 'admin_list_users(text, integer, integer)',
    'admin_user_detail(uuid)', 'admin_set_role(uuid, public.admin_role)',
    'admin_list_config()', 'admin_set_config(text, jsonb)',
    'admin_update_achievement(text, text, text, text, integer)', 'admin_list_faq()',
    'admin_save_faq(uuid, text, text, integer, boolean)', 'admin_delete_faq(uuid)',
    'admin_list_tickets(text)', 'admin_reply_ticket(uuid, text, text)',
    'admin_list_safety_events(boolean)', 'admin_review_safety_event(uuid)',
    'admin_send_campaign(text, text)', 'admin_audit(integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

insert into public.app_config (key, value, description) values
  ('ai_monthly_budget_usd', 'null', 'Monthly AI budget in USD for the dashboard (null = no cap; decision log 2026-09-28)'),
  ('ai_prices', '{"claude-sonnet-5": {"input": 2, "output": 10}, "claude-haiku-4-5": {"input": 1, "output": 5}, "claude-haiku-4-5-20251001": {"input": 1, "output": 5}}', 'USD per million tokens, for cost estimates in the dashboard'),
  ('min_app_version', '"1.0.0"', 'Older app versions are asked to update')
on conflict (key) do nothing;
