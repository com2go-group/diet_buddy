/**
 * LLM provider adapter (decision log 2026-09-25: Claude, behind an adapter so the provider can be
 * swapped). Functions depend on LlmProvider only.
 */

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  maxTokens: number;
}

export interface LlmResponse {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LlmProvider {
  complete(request: LlmRequest): Promise<LlmResponse>;
}

export class LlmError extends Error {
  readonly status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/** Anthropic Messages API. */
export function anthropicProvider(
  apiKey: string,
  model: string,
  fetchFn: typeof fetch = fetch,
): LlmProvider {
  return {
    async complete({ system, messages, maxTokens }) {
      const res = await fetchFn('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, system, messages, max_tokens: maxTokens }),
      }).catch((e: unknown) => {
        throw new LlmError(`network: ${String(e)}`);
      });
      if (!res.ok) throw new LlmError(`anthropic ${res.status}`, res.status);
      const data = (await res.json()) as {
        model?: string;
        content?: { type: string; text?: string }[];
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      return {
        text: (data.content ?? [])
          .filter((c) => c.type === 'text')
          .map((c) => c.text ?? '')
          .join(''),
        model: data.model ?? model,
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      };
    },
  };
}

/** Pulls the first JSON object out of a model reply (tolerates code fences or stray text). */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
