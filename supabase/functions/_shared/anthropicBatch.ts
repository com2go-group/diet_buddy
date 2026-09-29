import { z } from 'npm:zod@4';

import { workspaceFromEnv } from './llm.ts';

/**
 * Anthropic Message Batches API (half the price of the Messages API; results within 24 hours,
 * usually much sooner). Used for the nightly free-user meal plans (batch-meal-plans).
 */

export interface BatchRequest {
  /** Our reference for the result (the user ID): letters, digits, "-" and "_", ≤ 64. */
  custom_id: string;
  params: {
    model: string;
    max_tokens: number;
    system: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
  };
}

export interface BatchStatus {
  id: string;
  status: 'in_progress' | 'canceling' | 'ended';
  resultsUrl: string | null;
}

export interface BatchResult {
  customId: string;
  ok: boolean;
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface BatchClient {
  create(requests: BatchRequest[]): Promise<BatchStatus>;
  get(id: string): Promise<BatchStatus>;
  results(url: string): Promise<BatchResult[]>;
}

const statusSchema = z.object({
  id: z.string(),
  processing_status: z.enum(['in_progress', 'canceling', 'ended']),
  results_url: z.string().nullish(),
});

const lineSchema = z.object({
  custom_id: z.string(),
  result: z.object({
    type: z.string(),
    message: z
      .object({
        model: z.string().optional(),
        content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
        usage: z
          .object({ input_tokens: z.number().optional(), output_tokens: z.number().optional() })
          .optional(),
      })
      .optional(),
  }),
});

const toStatus = (body: unknown): BatchStatus => {
  const s = statusSchema.parse(body);
  return { id: s.id, status: s.processing_status, resultsUrl: s.results_url ?? null };
};

/** Parses the results file (JSON Lines); results come in any order, keyed by custom_id. */
export function parseResults(jsonl: string): BatchResult[] {
  const out: BatchResult[] = [];
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      continue;
    }
    const parsed = lineSchema.safeParse(raw);
    if (!parsed.success) continue;
    const { custom_id, result } = parsed.data;
    const message = result.message;
    out.push({
      customId: custom_id,
      ok: result.type === 'succeeded' && Boolean(message),
      text: (message?.content ?? [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join(''),
      model: message?.model ?? '',
      inputTokens: message?.usage?.input_tokens ?? 0,
      outputTokens: message?.usage?.output_tokens ?? 0,
    });
  }
  return out;
}

export function anthropicBatchClient(
  apiKey: string,
  fetchFn: typeof fetch = fetch,
  workspaceId: string | undefined = workspaceFromEnv(),
): BatchClient {
  const headers = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    ...(workspaceId ? { 'anthropic-workspace-id': workspaceId } : {}),
  };
  const call = async (url: string, init?: RequestInit) => {
    const res = await fetchFn(url, { ...init, headers });
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      throw new Error(`anthropic batches ${res.status}: ${detail}`);
    }
    return res;
  };
  return {
    async create(requests) {
      const res = await call('https://api.anthropic.com/v1/messages/batches', {
        method: 'POST',
        body: JSON.stringify({ requests }),
      });
      return toStatus(await res.json());
    },
    async get(id) {
      const res = await call(
        `https://api.anthropic.com/v1/messages/batches/${encodeURIComponent(id)}`,
      );
      return toStatus(await res.json());
    },
    async results(url) {
      return parseResults(await (await call(url)).text());
    },
  };
}
