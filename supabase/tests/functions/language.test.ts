import { englishQuery, translateFields, translateTexts } from '../../functions/_shared/language';
import type { LlmProvider } from '../../functions/_shared/llm';

const llmReplying = (text: string | Error): LlmProvider & { complete: jest.Mock } => ({
  complete: jest.fn(async () => {
    if (text instanceof Error) throw text;
    return { text, model: 'm', inputTokens: 3, outputTokens: 4 };
  }),
});

describe('translateTexts', () => {
  it('makes no call for English, no language or nothing to translate', async () => {
    const llm = llmReplying('{"t": []}');
    expect((await translateTexts(llm, ['Hi'], 'en')).texts).toEqual(['Hi']);
    expect((await translateTexts(llm, ['Hi'], undefined)).texts).toEqual(['Hi']);
    expect((await translateTexts(llm, [], 'de')).texts).toEqual([]);
    expect((await translateTexts(null, ['Hi'], 'de')).texts).toEqual(['Hi']);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('returns one translation per text and the usage', async () => {
    const llm = llmReplying('```json\n{"t": ["Hallo", "Tschüss"]}\n```');
    const out = await translateTexts(llm, ['Hello', 'Bye'], 'de');
    expect(out.texts).toEqual(['Hallo', 'Tschüss']);
    expect(out.usage).toEqual({ model: 'm', inputTokens: 3, outputTokens: 4 });
    expect(llm.complete.mock.calls[0][0].system).toContain('German');
    expect(llm.complete.mock.calls[0][0].system).toContain('never add, remove or change foods');
  });

  it.each([
    ['a reply of the wrong length', llmReplying('{"t": ["Hallo"]}')],
    ['a reply that is not JSON', llmReplying('Sorry, no.')],
    ['a failed call', llmReplying(new Error('down'))],
  ])('keeps the English texts on %s', async (_label, llm) => {
    expect((await translateTexts(llm, ['Hello', 'Bye'], 'fr')).texts).toEqual(['Hello', 'Bye']);
  });

  it('keeps an English text when its translation comes back empty', async () => {
    const llm = llmReplying('{"t": ["Ciao", " "]}');
    expect((await translateTexts(llm, ['Hello', 'Bye'], 'it')).texts).toEqual(['Ciao', 'Bye']);
  });
});

describe('translateFields', () => {
  it('translates only the named fields', async () => {
    const llm = llmReplying('{"t": ["Τίτλος", "Κείμενο"]}');
    const out = await translateFields(
      llm,
      [{ emoji: '💧', title: 'Title', body: 'Body' }],
      ['title', 'body'],
      'el',
    );
    expect(out.items).toEqual([{ emoji: '💧', title: 'Τίτλος', body: 'Κείμενο' }]);
  });
});

describe('englishQuery', () => {
  it('translates a non-English search, and falls back to what was typed', async () => {
    expect(await englishQuery(llmReplying('{"t": ["feta cheese"]}'), 'φέτα', 'el')).toBe(
      'feta cheese',
    );
    expect(await englishQuery(llmReplying('nope'), 'Quark', 'de')).toBe('Quark');
    expect(await englishQuery(llmReplying(new Error('x')), 'queso', 'es')).toBe('queso');
    const llm = llmReplying('{"t": ["x"]}');
    expect(await englishQuery(llm, 'oats', 'en')).toBe('oats');
    expect(llm.complete).not.toHaveBeenCalled();
  });
});
