import { z } from 'zod';

import { isAdult } from '@/lib/nutrition';

/**
 * Form schemas for auth. Messages are string keys from src/i18n/en.ts, translated where shown.
 * Password rules mirror supabase/config.toml (minimum 8, letters and digits).
 */

export type AuthMethod = 'email' | 'phone';

const required = { message: 'authErrors.required' } as const;

export const emailSchema = z
  .string()
  .trim()
  .min(1, required)
  .pipe(z.email({ message: 'authErrors.invalidEmail' }));

/** E.164 after removing spaces, dashes and brackets, e.g. "+44 7700 900123" → "+447700900123". */
export function normalizePhone(input: string): string {
  return input.replace(/[\s\-().]/g, '');
}

export const phoneSchema = z
  .string()
  .min(1, required)
  .transform(normalizePhone)
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, { message: 'authErrors.invalidPhone' }));

export const passwordSchema = z
  .string()
  .min(8, { message: 'authErrors.weakPassword' })
  .regex(/[A-Za-z]/, { message: 'authErrors.weakPassword' })
  .regex(/\d/, { message: 'authErrors.weakPassword' });

export const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: 'authErrors.invalidCode' });

/** Builds an ISO date from day/month/year fields; null when the date doesn't exist. */
export function toIsoDate(day: string, month: string, year: string): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y) || year.length !== 4) {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const birthDateSchema = z
  .object({ day: z.string(), month: z.string(), year: z.string() })
  .transform((v, ctx) => {
    const iso = toIsoDate(v.day, v.month, v.year);
    if (!iso) {
      ctx.addIssue({ code: 'custom', message: 'authErrors.invalidDate' });
      return z.NEVER;
    }
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    const birth = new Date(y, m - 1, d);
    if (birth.getFullYear() < 1900 || birth > new Date()) {
      ctx.addIssue({ code: 'custom', message: 'authErrors.invalidDate' });
      return z.NEVER;
    }
    if (!isAdult(birth)) {
      ctx.addIssue({ code: 'custom', message: 'authErrors.underage' });
      return z.NEVER;
    }
    return iso;
  });

const identifierFields = {
  method: z.enum(['email', 'phone']),
  email: z.string(),
  phone: z.string(),
};

/**
 * Object-level checks normally run only once every field is valid, which would hide an email or
 * password-confirmation error until the rest of the form is fixed. `always` runs them regardless,
 * so the check functions must cope with values that failed their own field validation.
 */
const always = { when: () => true };

/** Validates only the identifier for the chosen method. */
function checkIdentifier(
  v: { method: AuthMethod; email: string; phone: string },
  ctx: z.RefinementCtx,
): void {
  const field = v.method === 'phone' ? 'phone' : 'email';
  const result = (field === 'email' ? emailSchema : phoneSchema).safeParse(v[field] ?? '');
  if (!result.success) {
    ctx.addIssue({ code: 'custom', path: [field], message: result.error.issues[0]?.message ?? '' });
  }
}

const passwordsMatch = {
  ...always,
  path: ['confirmPassword'],
  message: 'authErrors.passwordMismatch',
};

export const signInSchema = z
  .object({ ...identifierFields, password: z.string().min(1, required) })
  .superRefine(checkIdentifier, always);

export const signUpSchema = z
  .object({
    ...identifierFields,
    name: z.string().trim().min(1, required).max(80),
    birthDate: birthDateSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine(checkIdentifier, always)
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);

export const forgotPasswordSchema = z.object(identifierFields).superRefine(checkIdentifier, always);

export const verifySchema = z.object({ code: codeSchema });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);

export type SignInValues = z.input<typeof signInSchema>;
export type SignUpValues = z.input<typeof signUpSchema>;
export type SignUpData = z.output<typeof signUpSchema>;
export type ForgotPasswordValues = z.input<typeof forgotPasswordSchema>;
export type VerifyValues = z.input<typeof verifySchema>;
export type NewPasswordValues = z.input<typeof newPasswordSchema>;

/** The identifier to send to Supabase for the chosen method. */
export function identifierOf(v: { method: AuthMethod; email: string; phone: string }): string {
  return v.method === 'email' ? v.email.trim().toLowerCase() : normalizePhone(v.phone);
}
