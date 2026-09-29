/**
 * Code-level safety net for the coach (CLAUDE.md §9): independent of the model, messages that
 * show signs of disordered eating or crisis always get a professional-help note.
 */

import type { Language } from '../_shared/language.ts';

export type SafetyFlag = 'none' | 'disordered_eating' | 'crisis' | 'medical';

const CRISIS = [
  /\b(kill|hurt|harm)(ing)? myself\b/i,
  /\bsuicid/i,
  /\bwant(ed)? to die\b/i,
  /\bend (it all|my life)\b/i,
  /\bself[- ]harm/i,
  // German, French, Spanish, Italian, Greek (the app's other languages).
  /\b(mich|mir) (umbringen|das leben nehmen)|\bselbstmord|\bsuizid|\bnicht mehr leben\b|\bselbstverletz/i,
  /\bme (tuer|suicider)\b|\bsuicid|\ben finir avec (la|ma) vie\b|\b(envie de|veux) mourir\b|\bme faire du mal\b|\bautomutil/i,
  /\b(matarme|quitarme la vida)\b|\bsuicid|\bquiero morir\b|\bhacerme daño|\bautolesi/i,
  /\b(uccidermi|togliermi la vita)\b|\bsuicid|\bvoglio morire\b|\bfarmi del male\b|\bautolesion/i,
  /αυτοκτον|να πεθάνω|να σκοτωθώ|να βλάψω τον εαυτό μου|αυτοτραυματισ/i,
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
  /\berbrechen\b|übergeben nach dem essen|\babführmittel|\bentwässerungs|\bdiätpillen|\b(mich )?aushungern|\bfressattacke|\bhasse meinen körper/i,
  /\bme faire vomir\b|\bvomir après|\blaxatifs?\b|\bdiurétiques?\b|\bpilules? (amaigrissantes?|pour maigrir)|\bm'affamer\b|\bcrises? de boulimie|\bboulimi|déteste mon corps/i,
  /\b(provocarme|me provoco) (el )?vómito|\bvomitar después|\blaxantes?\b|\bdiuréticos?\b|\bpastillas (para adelgazar|de dieta)|\bmatarme de hambre|\batracón|\batracones|\bodio mi cuerpo/i,
  /\bvomitare dopo|\bmi faccio vomitare|\blassativi\b|\bdiuretici\b|\bpillole dimagranti|\bmorire di fame\b|\babbuffat|\bodio il mio corpo/i,
  /να κάνω εμετό|κάνω εμετό μετά|καθαρτικ|διουρητικ|χάπια αδυνατίσματος|λιμοκτον|να μη φάω καθόλου|υπερφαγικ|μισώ το σώμα μου/i,
];

/** Flags a user message from its wording alone. */
export function screenMessage(text: string): SafetyFlag {
  if (CRISIS.some((r) => r.test(text))) return 'crisis';
  if (DISORDERED.some((r) => r.test(text))) return 'disordered_eating';
  return 'none';
}

type SupportNotes = Record<'crisis' | 'disordered_eating', string>;

export const SUPPORT_NOTES: SupportNotes = {
  crisis:
    'If you are in danger or thinking about ending your life, please contact your local emergency number (112 in the EU, 999 in the UK, 911 in the US) or a crisis line now. You deserve support, and you don’t have to go through this alone.',
  disordered_eating:
    'It might really help to talk this through with your doctor or an eating disorder support service (for example Beat in the UK, or NEDA in the US). DietBuddy is not a substitute for professional care.',
};

/** The same notes in the app's other languages (112 is the EU-wide emergency number). */
const LOCAL_NOTES: Partial<Record<Language, SupportNotes>> = {
  de: {
    crisis:
      'Wenn du in Gefahr bist oder daran denkst, dir das Leben zu nehmen, wende dich bitte sofort an den Notruf (112) oder eine Krisenhotline, in Deutschland z. B. die TelefonSeelsorge (0800 111 0 111). Du verdienst Unterstützung und musst das nicht allein durchstehen.',
    disordered_eating:
      'Es könnte dir wirklich helfen, darüber mit deiner Ärztin oder deinem Arzt oder einer Beratungsstelle für Essstörungen zu sprechen. DietBuddy ersetzt keine professionelle Hilfe.',
  },
  fr: {
    crisis:
      'Si tu es en danger ou si tu penses à mettre fin à tes jours, contacte tout de suite les urgences (112) ou une ligne d’écoute, en France le 3114. Tu mérites du soutien et tu n’as pas à traverser cela seul·e.',
    disordered_eating:
      'Cela pourrait vraiment t’aider d’en parler à ton médecin ou à un service spécialisé dans les troubles alimentaires. DietBuddy ne remplace pas une prise en charge professionnelle.',
  },
  es: {
    crisis:
      'Si estás en peligro o piensas en quitarte la vida, contacta ahora con emergencias (112) o una línea de crisis, en España el 024. Mereces apoyo y no tienes que pasar por esto solo/a.',
    disordered_eating:
      'Podría ayudarte mucho hablarlo con tu médico o con un servicio de apoyo para trastornos de la conducta alimentaria. DietBuddy no sustituye la atención profesional.',
  },
  it: {
    crisis:
      'Se sei in pericolo o pensi di toglierti la vita, contatta subito il numero di emergenza (112) o una linea di ascolto, in Italia il Telefono Amico (02 2327 2327). Meriti supporto e non devi affrontarlo da solo/a.',
    disordered_eating:
      'Potrebbe davvero aiutarti parlarne con il tuo medico o con un servizio per i disturbi alimentari (in Italia il numero verde SOS DCA 800 180 969). DietBuddy non sostituisce le cure di un professionista.',
  },
  el: {
    crisis:
      'Αν κινδυνεύετε ή σκέφτεστε να βάλετε τέλος στη ζωή σας, επικοινωνήστε τώρα με το 112 ή με τη Γραμμή Παρέμβασης για την Αυτοκτονία (1018). Αξίζετε υποστήριξη και δεν χρειάζεται να το περάσετε μόνοι.',
    disordered_eating:
      'Θα μπορούσε πραγματικά να βοηθήσει να το συζητήσετε με τον γιατρό σας ή με μια υπηρεσία υποστήριξης για διατροφικές διαταραχές. Το DietBuddy δεν υποκαθιστά την επαγγελματική φροντίδα.',
  },
};

/** The support note in the user's language (English when there is no translation). */
export function supportNote(flag: 'crisis' | 'disordered_eating', language?: Language): string {
  return (language && LOCAL_NOTES[language]?.[flag]) || SUPPORT_NOTES[flag];
}

/** The stricter of the model's flag and the keyword screen. */
export function combineFlags(model: SafetyFlag, screened: SafetyFlag): SafetyFlag {
  const rank: SafetyFlag[] = ['none', 'medical', 'disordered_eating', 'crisis'];
  return rank.indexOf(model) >= rank.indexOf(screened) ? model : screened;
}

/** Appends the support note in code, so it is there even if the model left it out. */
export function withSupportNote(reply: string, flag: SafetyFlag, language?: Language): string {
  if (flag !== 'crisis' && flag !== 'disordered_eating') return reply;
  const note = supportNote(flag, language);
  return reply.includes(note) ? reply : `${reply.trim()}\n\n${note}`;
}
