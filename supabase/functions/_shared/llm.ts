/**
 * LLM provider adapter (decision log 2026-09-25: Claude, behind an adapter so the provider can be
 * swapped). Functions depend on LlmProvider only.
 */

import type { ImageMediaType } from './image.ts';

export type { ImageMediaType };

/** A content block of a multimodal message (vision functions). */
export type LlmContentBlock =
  { type: 'text'; text: string } | { type: 'image'; mediaType: ImageMediaType; base64: string };

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string | LlmContentBlock[];
}

/** Anthropic's wire format for a message's content. */
function toAnthropicContent(content: LlmMessage['content']) {
  if (typeof content === 'string') return content;
  return content.map((b) =>
    b.type === 'text'
      ? b
      : { type: 'image', source: { type: 'base64', media_type: b.mediaType, data: b.base64 } },
  );
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

/**
 * Optional secret ANTHROPIC_WORKSPACE_ID: organisations that require a workspace on every
 * request reject keys that aren't scoped to one unless the request names the workspace.
 * Read through globalThis so this module also loads in Jest, where Deno doesn't exist.
 */
function workspaceFromEnv(): string | undefined {
  const deno = (globalThis as { Deno?: { env: { get(key: string): string | undefined } } }).Deno;
  return deno?.env.get('ANTHROPIC_WORKSPACE_ID') || undefined;
}

/** Anthropic Messages API. */
export function anthropicProvider(
  apiKey: string,
  model: string,
  fetchFn: typeof fetch = fetch,
  workspaceId: string | undefined = workspaceFromEnv(),
): LlmProvider {
  return {
    async complete({ system, messages, maxTokens }) {
      const res = await fetchFn('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          ...(workspaceId ? { 'anthropic-workspace-id': workspaceId } : {}),
        },
        body: JSON.stringify({
          model,
          system,
          messages: messages.map((m) => ({ role: m.role, content: toAnthropicContent(m.content) })),
          max_tokens: maxTokens,
        }),
      }).catch((e: unknown) => {
        throw new LlmError(`network: ${String(e)}`);
      });
      if (!res.ok) {
        // Anthropic's error message (never the prompt) makes key and billing problems visible
        // in the function logs.
        const detail = (await res.text().catch(() => '')).slice(0, 300);
        throw new LlmError(`anthropic ${res.status}: ${detail}`, res.status);
      }
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
