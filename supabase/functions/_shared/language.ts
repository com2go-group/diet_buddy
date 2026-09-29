import { z } from 'npm:zod@4';

import { extractJson, type LlmProvider } from './llm.ts';

/**
 * The app's languages (src/i18n). AI functions generate and safety-check in English; text the
 * user reads is then translated, so the code-level checks (diet rules, restrictive-advice
 * screens) always run on the English wording.
 */
export const LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'el'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  el: 'Greek',
};

/** Request field: an unknown or missing language means English. */
export const languageField = z.enum(LANGUAGES).optional().catch(undefined);

/** Prompt line for replies written directly in the user's language (coach chat). */
export function replyLanguageLine(language: Language | undefined): string {
  if (!language || language === 'en') return '';
  return `\nWrite every user-facing text in ${LANGUAGE_NAMES[language]}, whatever language the instructions above use. JSON keys and enum values stay in English.`;
}

const translationSchema = z.object({ t: z.array(z.string()) });

function translateSystem(target: string): string {
  return `You translate short texts from a nutrition app into ${target}.
You receive a JSON array of strings. Translate each one faithfully and naturally.
- Keep the meaning exactly: never add, remove or change foods, ingredients, amounts, numbers, times or advice.
- Keep emojis, units (g, kcal, ml, °C) and brand names as they are.
- Food names: use the everyday name a shopper in that language would use.
Reply with JSON only: {"t": [ ...one translated string per input, in the same order... ]}`;
}

export interface Translated {
  texts: string[];
  /** The call's usage for cost logging, when a model call was made. */
  usage?: { model: string; inputTokens: number; outputTokens: number };
}

/**
 * Translates `texts` into `to` with one model call. Anything unexpected (a failed call, a reply
 * that isn't one string per input) returns the originals, so users see English rather than
 * nothing.
 */
export async function translateTexts(
  llm: LlmProvider | null,
  texts: string[],
  to: Language | undefined,
): Promise<Translated> {
  if (!llm || !to || to === 'en' || !texts.length) return { texts };
  try {
    const res = await llm.complete({
      system: translateSystem(LANGUAGE_NAMES[to]),
      messages: [{ role: 'user', content: JSON.stringify(texts) }],
      maxTokens: Math.min(4000, 200 + texts.join(' ').length * 2),
    });
    const usage = {
      model: res.model,
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
    };
    const parsed = translationSchema.safeParse(extractJson(res.text));
    if (!parsed.success || parsed.data.t.length !== texts.length) return { texts, usage };
    return { texts: parsed.data.t.map((s, i) => s.trim() || texts[i]!), usage };
  } catch (e) {
    console.error('translateTexts failed', e);
    return { texts };
  }
}

/** A food search typed in another language, turned into an English query for USDA. */
export async function englishQuery(
  llm: LlmProvider | null,
  query: string,
  from: Language | undefined,
): Promise<string> {
  if (!llm || !from || from === 'en') return query;
  try {
    const res = await llm.complete({
      system: `Translate this ${LANGUAGE_NAMES[from]} food search into the short English name a US food database would use (e.g. "chicken breast", "greek yogurt", "feta cheese"). Reply with JSON only: {"t": ["..."]}`,
      messages: [{ role: 'user', content: JSON.stringify([query]) }],
      maxTokens: 60,
    });
    const parsed = translationSchema.safeParse(extractJson(res.text));
    const english = parsed.success ? parsed.data.t[0]?.trim() : '';
    return english && english.length <= 100 ? english : query;
  } catch (e) {
    console.error('englishQuery failed', e);
    return query;
  }
}

/** Translates the given string fields of each item (other fields are kept as they are). */
export async function translateFields<T extends object, K extends keyof T & string>(
  llm: LlmProvider | null,
  items: T[],
  keys: K[],
  to: Language | undefined,
): Promise<{ items: T[]; usage?: Translated['usage'] }> {
  const texts = items.flatMap((item) => keys.map((k) => String(item[k] ?? '')));
  const out = await translateTexts(llm, texts, to);
  if (out.texts === texts) return { items, usage: out.usage };
  let i = 0;
  const translated = items.map((item) => {
    const copy = { ...item };
    for (const k of keys) (copy as Record<string, unknown>)[k] = out.texts[i++];
    return copy;
  });
  return { items: translated, usage: out.usage };
}
