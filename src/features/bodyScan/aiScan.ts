import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';

import { optional, supabase } from '@/lib/supabase';

/** Privacy notice version the body-photo consent is given against. */
export const BODY_PHOTO_CONSENT_VERSION = '2026-09-28';

const measurementsSchema = z.object({
  waistCm: z.number(),
  hipCm: z.number(),
  neckCm: z.number(),
  confidence: z.enum(['low', 'medium', 'high']),
});
export type Measurements = z.infer<typeof measurementsSchema>;

export type BodyScanErrorCode =
  | 'face_visible'
  | 'unusable_photos'
  | 'consent_required'
  | 'premium_required'
  | 'rate_limited'
  | 'not_configured'
  | 'invalid_image'
  | 'failed';

export class BodyScanError extends Error {
  constructor(readonly code: BodyScanErrorCode) {
    super(code);
  }
}

const CODES: BodyScanErrorCode[] = [
  'face_visible',
  'unusable_photos',
  'consent_required',
  'premium_required',
  'rate_limited',
  'not_configured',
  'invalid_image',
];

export async function hasBodyPhotoConsent(userId: string): Promise<boolean> {
  const rows = optional(
    await supabase
      .from('consents')
      .select('granted')
      .eq('user_id', userId)
      .eq('consent_type', 'body_photos')
      .limit(1),
  );
  return Boolean(rows?.[0]?.granted);
}

export async function setBodyPhotoConsent(granted: boolean): Promise<void> {
  optional(
    await supabase.rpc('set_consent', {
      p_type: 'body_photos',
      p_granted: granted,
      p_version: BODY_PHOTO_CONSENT_VERSION,
    }),
  );
}

/** Sends the two photos for a one-off estimate; they are not stored anywhere. */
export async function analyzeBodyScan(front: string, side: string): Promise<Measurements> {
  const { data, error } = await supabase.functions.invoke('analyze-body-scan', {
    body: { front, side },
  });
  if (error) {
    let code: BodyScanErrorCode = 'failed';
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      code = CODES.find((c) => c === body?.error) ?? 'failed';
    }
    throw new BodyScanError(code);
  }
  const parsed = z.object({ measurements: measurementsSchema }).safeParse(data);
  if (!parsed.success) throw new BodyScanError('failed');
  return parsed.data.measurements;
}
