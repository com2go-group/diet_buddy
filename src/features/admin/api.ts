import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase, type Database, type Json } from '@/lib/supabase';

type Fns = Database['public']['Functions'];
export type AdminRole = Database['public']['Enums']['admin_role'];
export type AdminUserRow = Fns['admin_list_users']['Returns'][number];
export type ConfigRow = Fns['admin_list_config']['Returns'][number];
export type FaqRow = Fns['admin_list_faq']['Returns'][number];
export type TicketRow = Fns['admin_list_tickets']['Returns'][number];
export type SafetyRow = Fns['admin_list_safety_events']['Returns'][number];
export type AuditRow = Fns['admin_audit']['Returns'][number];

export const ROLE_RANK: Record<AdminRole, number> = { support: 1, admin: 2, owner: 3 };
export const atLeast = (role: AdminRole | null | undefined, min: AdminRole) =>
  Boolean(role) && ROLE_RANK[role!] >= ROLE_RANK[min];

/** Database errors carry a message the admin can act on (e.g. validation); show it. */
export class AdminError extends Error {}

function unwrap<T>(r: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (r.error) throw new AdminError(r.error.message);
  return r.data as T;
}

export async function adminMe(): Promise<{ role: AdminRole; mfaVerified: boolean } | null> {
  const rows = unwrap(await supabase.rpc('admin_me'));
  const row = rows?.[0];
  return row ? { role: row.role, mfaVerified: row.mfa_verified } : null;
}

export interface AdminStats {
  users_total: number;
  users_7d: number;
  users_30d: number;
  onboarded: number;
  premium: number;
  active_today: number;
  active_7d: number;
  open_tickets: number;
  open_safety: number;
  ai_month: {
    function: string;
    model: string;
    calls: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  }[];
  ai_budget_usd: number | null;
}

export const loadStats = async () =>
  unwrap(await supabase.rpc('admin_stats')) as unknown as AdminStats;

export const listUsers = async (search: string, offset = 0) =>
  unwrap(
    await supabase.rpc('admin_list_users', { p_search: search, p_limit: 50, p_offset: offset }),
  );

export interface AdminUserDetail {
  user_id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  name: string | null;
  is_premium: boolean;
  xp: number | null;
  streak_days: number | null;
  onboarded: string | null;
  admin_role: AdminRole | null;
  counts: Record<string, number>;
  consents: Record<string, boolean>;
  tickets: { id: string; subject: string; status: string; created_at: string }[];
}

export const loadUser = async (id: string) =>
  unwrap(
    await supabase.rpc('admin_user_detail', { p_user: id }),
  ) as unknown as AdminUserDetail | null;

export const setRole = async (id: string, role: AdminRole | null) =>
  unwrap(await supabase.rpc('admin_set_role', { p_user: id, p_role: role }));

export const listConfig = async () => unwrap(await supabase.rpc('admin_list_config'));
export const setConfig = async (key: string, value: Json) =>
  unwrap(await supabase.rpc('admin_set_config', { p_key: key, p_value: value }));

export const listAchievements = async () =>
  unwrap(
    await supabase
      .from('achievements')
      .select('code, title, description, emoji, xp_reward')
      .order('xp_reward'),
  );
export const updateAchievement = async (a: {
  code: string;
  title: string;
  description: string;
  emoji: string;
  xp: number;
}) =>
  unwrap(
    await supabase.rpc('admin_update_achievement', {
      p_code: a.code,
      p_title: a.title,
      p_description: a.description,
      p_emoji: a.emoji,
      p_xp: a.xp,
    }),
  );

export const listFaq = async () => unwrap(await supabase.rpc('admin_list_faq'));
export const saveFaq = async (f: {
  id: string | null;
  question: string;
  answer: string;
  sort: number;
  published: boolean;
}) =>
  unwrap(
    await supabase.rpc('admin_save_faq', {
      p_id: f.id,
      p_question: f.question,
      p_answer: f.answer,
      p_sort: f.sort,
      p_published: f.published,
    }),
  );
export const deleteFaq = async (id: string) =>
  unwrap(await supabase.rpc('admin_delete_faq', { p_id: id }));

export const listTickets = async (status: string | null) =>
  unwrap(await supabase.rpc('admin_list_tickets', { p_status: status }));
export const replyTicket = async (id: string, reply: string, status: 'answered' | 'closed') =>
  unwrap(await supabase.rpc('admin_reply_ticket', { p_id: id, p_reply: reply, p_status: status }));

export const listSafety = async (openOnly: boolean) =>
  unwrap(await supabase.rpc('admin_list_safety_events', { p_open_only: openOnly }));
export const reviewSafety = async (id: string) =>
  unwrap(await supabase.rpc('admin_review_safety_event', { p_id: id }));

export const sendCampaign = async (title: string, body: string) =>
  unwrap(await supabase.rpc('admin_send_campaign', { p_title: title, p_body: body }));

export const loadAudit = async () => unwrap(await supabase.rpc('admin_audit', { p_limit: 200 }));

export type UserAction = 'export' | 'delete' | 'ban' | 'unban';

/** Service-role actions through the admin-users Edge Function. */
export async function userAction(
  action: UserAction,
  userId: string,
  confirm?: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, userId, confirm },
  });
  if (error) {
    let code = 'failed';
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      code = body?.error ?? code;
    }
    throw new AdminError(code);
  }
  return data as Record<string, unknown>;
}

// ─── two-factor sign-in (Supabase MFA, TOTP) ─────────────────────────────────

export async function mfaState(): Promise<{ factorId: string | null; verified: boolean }> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new AdminError(error.message);
  const factor = data.totp.find((f) => f.status === 'verified') ?? null;
  return { factorId: factor?.id ?? null, verified: Boolean(factor) };
}

/** GoTrue returns "data:image/svg+xml;utf-8,<svg…>" unencoded; images need it URL-encoded. */
export function qrDataUrl(raw: string): string {
  const match = /^data:image\/svg\+xml;utf-8,(.*)$/s.exec(raw);
  return match ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(match[1]!)}` : raw;
}

export async function enrollTotp(): Promise<{ factorId: string; qr: string; secret: string }> {
  // Unverified leftovers from an abandoned setup would block a new one with the same name.
  const { data: list } = await supabase.auth.mfa.listFactors();
  for (const f of list?.all ?? []) {
    if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    // The Site URL is the app scheme (dietbuddy://), which has no host to derive an issuer from.
    issuer: 'DietBuddy',
    friendlyName: `DietBuddy admin ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error) throw new AdminError(error.message);
  return { factorId: data.id, qr: qrDataUrl(data.totp.qr_code), secret: data.totp.secret };
}

export async function verifyTotp(factorId: string, code: string): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw new AdminError(error.message);
}
