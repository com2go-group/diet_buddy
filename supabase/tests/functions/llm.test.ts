import { anthropicProvider, noThinking } from '../../functions/_shared/llm';

describe('noThinking', () => {
  it('turns thinking off in the form each model accepts', () => {
    expect(noThinking('claude-sonnet-5')).toEqual({ thinking: { type: 'disabled' } });
    expect(noThinking('claude-haiku-4-5')).toEqual({ thinking: { type: 'disabled' } });
    expect(noThinking('claude-sonnet-5-5')).toEqual({ thinking: { type: 'between_tools' } });
    expect(noThinking('claude-opus-5-5')).toEqual({ output_config: { effort: 'low' } });
    expect(noThinking('claude-fable-5-1')).toEqual({ output_config: { effort: 'low' } });
  });

  it('is sent with every request, so a tight max_tokens is left for the answer', async () => {
    const fetchFn = jest.fn(
      async () =>
        new Response(JSON.stringify({ content: [{ type: 'text', text: '{}' }], usage: {} })),
    );
    await anthropicProvider('key', 'claude-sonnet-5', fetchFn as unknown as typeof fetch).complete({
      system: 's',
      maxTokens: 700,
      messages: [{ role: 'user', content: 'hi' }],
    });
    const body = JSON.parse(
      (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.max_tokens).toBe(700);
  });
});
