import { de } from './de';
import { el } from './el';
import { en, type Strings } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = {
  [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>>;
}[keyof T];

export type StringKey = Paths<Strings>;

/** A translation: same keys as English, any text. Missing keys fall back to English. */
type Widen<T> = { [K in keyof T]?: T[K] extends string ? string : Widen<T[K]> };
export type Translation = Widen<Strings>;

/** App languages (CLAUDE.md §1: built i18n-ready; EU launch). */
export const LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'el'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Each language's own name, for the language picker. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  el: 'Ελληνικά',
};

/** Number and date formats per language (British English keeps day-month order and metric). */
const LOCALES: Record<Language, string> = {
  en: 'en-GB',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  el: 'el-GR',
};

const dictionaries: Record<Language, Translation> = { en, de, fr, es, it, el };

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);

/** The device's language if the app has it, else English. */
export function deviceLanguage(): Language {
  try {
    const code = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2).toLowerCase();
    return isLanguage(code) ? code : 'en';
  } catch {
    return 'en';
  }
}

let current: Language = deviceLanguage();

export const getLanguage = (): Language => current;
export const getLocale = (): string => LOCALES[current];
export function setLanguage(language: Language): void {
  current = language;
}

function lookup(dictionary: Translation, key: string): string | undefined {
  let node: unknown = dictionary;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Looks up a copy string by dotted key and fills {{placeholders}}; English if not translated. */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  const template = lookup(dictionaries[current], key) ?? lookup(en, key) ?? key;
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** For tests: every key path of the English strings. */
export function keysOf(node: object, prefix = ''): string[] {
  return Object.entries(node).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : keysOf(v as object, `${prefix}${k}.`),
  );
}
export { dictionaries, lookup };
