import { z } from 'npm:zod@4';

import { BODY_SCAN_PROMPT_VERSION, bodyScanSystemPrompt } from '../_prompts/bodyScan.v1.ts';
import { corsHeaders, fail, json } from '../_shared/http.ts';
import { BASE64, detectMediaType, stripJpegMetadata } from '../_shared/image.ts';
import { extractJson, type LlmContentBlock, type LlmProvider } from '../_shared/llm.ts';

export interface BodyScanContext {
  premium: boolean;
  /** Explicit consent to send body photos for analysis (consent_type body_photos). */
  photoConsent: boolean;
  heightCm: number | null;
  sex: 'male' | 'female' | 'unspecified';
}

export interface BodyScanStore {
  context(userId: string): Promise<BodyScanContext>;
  scansSince(userId: string, since: Date): Promise<number>;
  logUsage(userId: string, model: string, inputTokens: number, outputTokens: number): Promise<void>;
}

export interface Measurements {
  waistCm: number;
  hipCm: number;
  neckCm: number;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Where the estimate comes from. 'ai' uses the vision model; a licensed body-scan SDK can be
 * added later as another estimator with the same shape (decision log 2026-09-28).
 */
export interface BodyScanEstimator {
  estimate(
    photos: { front: LlmContentBlock; side: LlmContentBlock },
    body: { heightCm: number; sex: string },
  ): Promise<
    | { kind: 'ok'; measurements: Measurements; model: string; input: number; output: number }
    | {
        kind: 'face_visible' | 'unusable' | 'failed';
        model: string | null;
        input: number;
        output: number;
      }
  >;
}

export interface BodyScanDeps {
  getUserId(req: Request): Promise<string | null>;
  store: BodyScanStore;
  estimator: BodyScanEstimator | null;
  now?: () => Date;
}

export const DAILY_LIMIT = 5;
export const MAX_BASE64_LENGTH = 5_000_000;

const requestSchema = z.object({
  front: z.string().min(100).max(MAX_BASE64_LENGTH),
  side: z.string().min(100).max(MAX_BASE64_LENGTH),
});

const aiSchema = z.object({
  usable: z.boolean(),
  face_visible: z.boolean(),
  waist_cm: z.number().nullable(),
  hip_cm: z.number().nullable(),
  neck_cm: z.number().nullable(),
  confidence: z.enum(['low', 'medium', 'high']).catch('low'),
});

/** Plausible adult ranges, and the waist must exceed the neck (the Navy formula needs it). */
export function plausible(m: { waistCm: number; hipCm: number; neckCm: number }, heightCm: number) {
  return (
    m.waistCm >= 45 &&
    m.waistCm <= 200 &&
    m.hipCm >= 60 &&
    m.hipCm <= 200 &&
    m.neckCm >= 25 &&
    m.neckCm <= 60 &&
    m.waistCm > m.neckCm &&
    m.waistCm < heightCm &&
    m.hipCm < heightCm
  );
}

function toBlock(raw: string): LlmContentBlock | null {
  const image = raw.replace(/^data:[^,]*,/, '').replace(/\s/g, '');
  const mediaType = detectMediaType(image);
  if (!mediaType || !BASE64.test(image)) return null;
  return {
    type: 'image',
    mediaType,
    base64: mediaType === 'image/jpeg' ? stripJpegMetadata(image) : image,
  };
}

/** Vision-model estimator: one attempt plus one retry on invalid JSON. */
export function aiEstimator(llm: LlmProvider): BodyScanEstimator {
  return {
    async estimate({ front, side }, body) {
      let input = 0;
      let output = 0;
      let model: string | null = null;
      const messages = [
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: 'Front view:' },
            front,
            { type: 'text' as const, text: 'Side view:' },
            side,
          ],
        },
      ];
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await llm
          .complete({
            system: bodyScanSystemPrompt(body.heightCm, body.sex),
            messages,
            maxTokens: 300,
          })
          .catch(() => null);
        if (!result) continue;
        model = result.model;
        input += result.inputTokens;
        output += result.outputTokens;
        const parsed = aiSchema.safeParse(extractJson(result.text));
        if (!parsed.success) continue;
        const a = parsed.data;
        if (a.face_visible) return { kind: 'face_visible', model, input, output };
        if (!a.usable || a.waist_cm === null || a.hip_cm === null || a.neck_cm === null) {
          return { kind: 'unusable', model, input, output };
        }
        const m = {
          waistCm: Math.round(a.waist_cm * 10) / 10,
          hipCm: Math.round(a.hip_cm * 10) / 10,
          neckCm: Math.round(a.neck_cm * 10) / 10,
        };
        if (!plausible(m, body.heightCm)) return { kind: 'unusable', model, input, output };
        return {
          kind: 'ok',
          measurements: { ...m, confidence: a.confidence },
          model,
          input,
          output,
        };
      }
      return { kind: 'failed', model, input, output };
    },
  };
}

/**
 * POST { front, side } → { measurements } (waist, hip, neck in cm + confidence). Premium only;
 * needs the separate body-photo consent; photos are never stored; a visible face is refused.
 * The app computes body fat from the measurements (U.S. Navy) and the user can edit everything.
 */
export async function handleAnalyzeBodyScan(req: Request, deps: BodyScanDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  try {
    const userId = await deps.getUserId(req);
    if (!userId) return fail('unauthorized', 401);
    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('invalid_request', 400);
    const front = toBlock(parsed.data.front);
    const side = toBlock(parsed.data.side);
    if (!front || !side) return fail('invalid_image', 400);

    const { store } = deps;
    const ctx = await store.context(userId);
    if (!ctx.premium) return fail('premium_required', 403);
    if (!ctx.photoConsent) return fail('consent_required', 403);
    if (!ctx.heightCm) return fail('no_profile', 409);
    if (!deps.estimator) return fail('not_configured', 503);
    const now = deps.now?.() ?? new Date();
    if ((await store.scansSince(userId, new Date(now.getTime() - 86_400_000))) >= DAILY_LIMIT) {
      return fail('rate_limited', 429);
    }

    const result = await deps.estimator.estimate(
      { front, side },
      { heightCm: ctx.heightCm, sex: ctx.sex === 'unspecified' ? 'not specified' : ctx.sex },
    );
    if (result.model) await store.logUsage(userId, result.model, result.input, result.output);
    if (result.kind === 'face_visible') return fail('face_visible', 422);
    if (result.kind === 'unusable') return fail('unusable_photos', 422);
    if (result.kind !== 'ok') return fail('analysis_failed', 502);
    return json({ measurements: result.measurements, promptVersion: BODY_SCAN_PROMPT_VERSION });
  } catch (e) {
    console.error('analyze-body-scan failed', e);
    return fail('server_error', 500);
  }
}
