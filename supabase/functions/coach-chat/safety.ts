/**
 * Code-level safety net for the coach (CLAUDE.md §9): independent of the model, messages that
 * show signs of disordered eating or crisis always get a professional-help note.
 */

export type SafetyFlag = 'none' | 'disordered_eating' | 'crisis' | 'medical';

const CRISIS = [
  /\b(kill|hurt|harm)(ing)? myself\b/i,
  /\bsuicid/i,
  /\bwant(ed)? to die\b/i,
  /\bend (it all|my life)\b/i,
  /\bself[- ]harm/i,
];

const DISORDERED = [
  /\b(make|made|making) myself (sick|throw up|vomit)\b/i,
  /\bthrow(ing)? up after (eating|meals?|food)\b/i,
  /\bpurg(e|ed|ing)\b/i,
  /\blaxatives?\b/i,
  /\bdiuretics?\b/i,
  /\bdiet pills?\b/i,
  /\bstarv(e|ing|ed) myself\b/i,
  /\b(not|stop|stopped) eating (for|at all)\b/i,
  /\b(binge|binged|bingeing|binging)\b/i,
  /\bpunish(ing)? myself\b/i,
  /\bhate my body\b/i,
  /\b(300|400|500|600|700|800) (kcal|calories) a day\b/i,
];

/** Flags a user message from its wording alone. */
export function screenMessage(text: string): SafetyFlag {
  if (CRISIS.some((r) => r.test(text))) return 'crisis';
  if (DISORDERED.some((r) => r.test(text))) return 'disordered_eating';
  return 'none';
}

export const SUPPORT_NOTES: Record<'crisis' | 'disordered_eating', string> = {
  crisis:
    'If you are in danger or thinking about ending your life, please contact your local emergency number (112 in the EU, 999 in the UK, 911 in the US) or a crisis line now. You deserve support, and you don’t have to go through this alone.',
  disordered_eating:
    'It might really help to talk this through with your doctor or an eating disorder support service (for example Beat in the UK, or NEDA in the US). DietBuddy is not a substitute for professional care.',
};

/** The stricter of the model's flag and the keyword screen. */
export function combineFlags(model: SafetyFlag, screened: SafetyFlag): SafetyFlag {
  const rank: SafetyFlag[] = ['none', 'medical', 'disordered_eating', 'crisis'];
  return rank.indexOf(model) >= rank.indexOf(screened) ? model : screened;
}

/** Appends the support note in code, so it is there even if the model left it out. */
export function withSupportNote(reply: string, flag: SafetyFlag): string {
  if (flag !== 'crisis' && flag !== 'disordered_eating') return reply;
  const note = SUPPORT_NOTES[flag];
  return reply.includes(note) ? reply : `${reply.trim()}\n\n${note}`;
}
