import { en, type Strings } from './en';

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = {
  [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>>;
}[keyof T];

export type StringKey = Paths<Strings>;

const dictionary: Strings = en;

/** Looks up a copy string by dotted key and fills {{placeholders}}. */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  let node: unknown = dictionary;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown>)[part];
  }
  const template = typeof node === 'string' ? node : key;
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
