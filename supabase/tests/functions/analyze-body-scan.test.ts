import type { LlmProvider, LlmRequest } from '../../functions/_shared/llm';
import {
  aiEstimator,
  DAILY_LIMIT,
  handleAnalyzeBodyScan,
  plausible,
  type BodyScanContext,
  type BodyScanDeps,
} from '../../functions/analyze-body-scan/handler';

const seg = String.fromCharCode(0xff, 0xe1, 0x00, 0x08) + 'GPS51N';
const JPEG = btoa(
  '\xff\xd8' + seg + '\xff\xdb\x00\x68qq' + 'x'.repeat(100) + '\xff\xda\x00\x02data',
);

const reply = (o: object) =>
  JSON.stringify({
    usable: true,
    face_visible: false,
    waist_cm: 84,
    hip_cm: 98,
    neck_cm: 36,
    confidence: 'medium',
    ...o,
  });

function setup(opts: { replies?: string[]; ctx?: Partial<BodyScanContext>; used?: number } = {}) {
  const requests: LlmRequest[] = [];
  const usage: number[][] = [];
  const replies = [...(opts.replies ?? [reply({})])];
  const llm: LlmProvider = {
    complete: jest.fn(async (req: LlmRequest) => {
      requests.push(req);
      return {
        text: replies.shift() ?? '',
        model: 'claude-test',
        inputTokens: 900,
        outputTokens: 30,
      };
    }),
  };
  const deps: BodyScanDeps = {
    getUserId: async () => 'user-1',
    estimator: aiEstimator(llm),
    store: {
      context: async () => ({
        premium: true,
        photoConsent: true,
        heightCm: 178,
        sex: 'male',
        ...opts.ctx,
      }),
      scansSince: async () => opts.used ?? 0,
      logUsage: async (_u, _m, i, o) => void usage.push([i, o]),
    },
  };
  return { deps, requests, usage };
}

const post = (body: object = { front: JPEG, side: JPEG }) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

describe('analyze-body-scan', () => {
  it('returns tape measurements, using the profile height for scale, without photo metadata', async () => {
    const { deps, requests, usage } = setup();
    const res = await handleAnalyzeBodyScan(post(), deps);
    expect(res.status).toBe(200);
    expect((await res.json()).measurements).toEqual({
      waistCm: 84,
      hipCm: 98,
      neckCm: 36,
      confidence: 'medium',
    });
    expect(requests[0]!.system).toContain('178 cm tall');
    expect(requests[0]!.system).toContain('Do not comment on appearance');
    const blocks = requests[0]!.messages[0]!.content as { type: string; base64?: string }[];
    expect(blocks.filter((b) => b.type === 'image')).toHaveLength(2);
    expect(atob(blocks[1]!.base64!)).not.toContain('GPS');
    expect(usage).toEqual([[900, 30]]);
  });

  it('refuses photos with a face, unusable photos and implausible numbers', async () => {
    const face = setup({ replies: [reply({ face_visible: true })] });
    expect(await (await handleAnalyzeBodyScan(post(), face.deps)).json()).toEqual({
      error: 'face_visible',
    });
    const bad = setup({ replies: [reply({ usable: false, waist_cm: null })] });
    expect(await (await handleAnalyzeBodyScan(post(), bad.deps)).json()).toEqual({
      error: 'unusable_photos',
    });
    const silly = setup({ replies: [reply({ waist_cm: 30, neck_cm: 40 })] });
    expect(await (await handleAnalyzeBodyScan(post(), silly.deps)).json()).toEqual({
      error: 'unusable_photos',
    });
  });

  it('retries once on invalid JSON, then fails gracefully', async () => {
    const ok = setup({ replies: ['nope', reply({})] });
    expect((await handleAnalyzeBodyScan(post(), ok.deps)).status).toBe(200);
    expect(ok.usage).toEqual([[1800, 60]]);
    const fail = setup({ replies: ['nope', 'nope'] });
    expect((await handleAnalyzeBodyScan(post(), fail.deps)).status).toBe(502);
  });

  it('needs Premium, the body-photo consent, a height, a model and daily headroom', async () => {
    const code = async (s: ReturnType<typeof setup>) =>
      (await (await handleAnalyzeBodyScan(post(), s.deps)).json()).error;
    expect(await code(setup({ ctx: { premium: false } }))).toBe('premium_required');
    expect(await code(setup({ ctx: { photoConsent: false } }))).toBe('consent_required');
    expect(await code(setup({ ctx: { heightCm: null } }))).toBe('no_profile');
    expect(await code(setup({ used: DAILY_LIMIT }))).toBe('rate_limited');
    const none = setup();
    expect((await handleAnalyzeBodyScan(post(), { ...none.deps, estimator: null })).status).toBe(
      503,
    );
    expect(
      (
        await handleAnalyzeBodyScan(
          post({ front: 'PHN2Zz4' + 'A'.repeat(200), side: JPEG }),
          none.deps,
        )
      ).status,
    ).toBe(400);
  });

  it('checks plausibility', () => {
    expect(plausible({ waistCm: 84, hipCm: 98, neckCm: 36 }, 178)).toBe(true);
    expect(plausible({ waistCm: 35, hipCm: 98, neckCm: 36 }, 178)).toBe(false);
    expect(plausible({ waistCm: 190, hipCm: 195, neckCm: 50 }, 160)).toBe(false);
  });
});
