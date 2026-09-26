/** A paragraph, or a bulleted list. `{{company}}`-style placeholders are filled from config. */
export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  title: string;
  /** ISO date the text last changed. */
  updated: string;
  intro: LegalBlock[];
  sections: LegalSection[];
}
