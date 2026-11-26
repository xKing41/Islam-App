/**
 * Abgleich der erkannten Wörter mit dem erwarteten Korantext (Wort für Wort).
 *
 * Grundsatz: Ein Wort gilt nur dann als richtig, wenn es Buchstabe für Buchstabe dem erwarteten Wort
 * entspricht. Toleriert werden ausschließlich Schreibvarianten, die an der Aussprache nichts ändern
 * (Vokalzeichen, Hamza-Träger, Alif-Formen, Ta marbuta/Ha, Alif maqsura/Ya). Schon ein anderer
 * Buchstabe – etwa „نرزقهم“ statt „نرزقكم“ oder „يعلمون“ statt „تعلمون“ – ist ein Fehler.
 *
 * Verfahren: Editierdistanz auf Wortebene (wie bei der Wortfehlerrate) mit zusätzlichen Schritten für
 * Zusammen-/Getrenntschreibung und Wiederholungen (Selbstkorrektur). Am Ende des erwarteten Textes ist
 * die Lücke „kostenlos“ – noch nicht rezitierte Wörter gelten als offen, nicht als Fehler.
 *
 * Rein rechnerisch, ohne React-Native-Abhängigkeiten (wird mit Unit-Tests und an echten Rezitationen
 * geprüft: scripts/recite-eval).
 */
import { normalizeArabic } from '../quran/text';

export type WordStatus = 'pending' | 'correct' | 'wrong' | 'missing' | 'uncertain';

/** Ein erkanntes Wort: so wie erkannt (mit Vokalzeichen, für die Anzeige) und vereinheitlicht (für den Vergleich). */
export type Token = { raw: string; norm: string };

export type ExtraKind = 'extra' | 'repeat' | 'corrected';

export type Extra = {
  /** Steht vor dem erwarteten Wort mit diesem Index. */
  before: number;
  word: string;
  /** extra = zusätzliches Wort (Fehler), repeat = Wiederholung bereits rezitierter Wörter, corrected = sofort selbst korrigiert. */
  kind: ExtraKind;
  /** Index im Strom der erkannten Wörter. */
  heardIndex: number;
  /** Nur eine der beiden Erkennungen hat das Wort gehört. */
  uncertain?: boolean;
};

export type Alignment = {
  /** Status je erwartetem Wort. */
  status: WordStatus[];
  /** Was statt eines falschen Wortes gehört wurde (wie erkannt, mit Vokalzeichen). */
  heardFor: (string | null)[];
  /** Index des erkannten Wortes, das dem erwarteten Wort zugeordnet wurde (-1 = keins). */
  heardAt: number[];
  /** Zusätzlich gehörte Wörter. */
  extras: Extra[];
  /** Anzahl erwarteter Wörter, die bereits „erreicht“ wurden (Fortschritt). */
  reached: number;
};

const DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/;

/** Zerlegt (erkannten) arabischen Text in Wörter – mit und ohne Vokalzeichen. */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  // Buchstaben, Tatweel, Vokal- und Koranzeichen behalten, alles andere trennt Wörter
  const cleaned = text.replace(/[^\u0621-\u064A\u064B-\u065F\u0670\u0671\u06D6-\u06ED]+/g, ' ');
  for (const piece of cleaned.split(' ')) {
    if (!piece) continue;
    const norm = normalizeArabic(piece).replace(/[^\u0621-\u064A]/g, '');
    if (norm) out.push({ raw: piece.replace(/\u0640/g, ''), norm });
  }
  return out;
}

/** Zerlegt arabischen Text in vereinheitlichte Wörter (ohne Vokalzeichen). */
export function toWords(text: string): string[] {
  return tokenize(text).map((t) => t.norm);
}

/** True, wenn der Text Vokalzeichen enthält. */
export function hasDiacritics(text: string): boolean {
  return DIACRITICS.test(text);
}

/**
 * Vergleichsform: Hier könnten Schreibvarianten ohne Einfluss auf die Aussprache zusammengeführt werden.
 * Alles, was die Aussprache oder Bedeutung ändern kann, bleibt unterscheidbar.
 */
export function matchForm(norm: string): string {
  return norm;
}

/** Streng: gleiche Buchstabenfolge (nach dem Vereinheitlichen). */
export function wordsMatch(expected: string, heard: string): boolean {
  return expected === heard || matchForm(expected) === matchForm(heard);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Ähnlichkeit zweier Wörter zwischen 0 und 1 – nur für die Zuordnung, nicht für richtig/falsch. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

const ISTIADHA = toWords('أعوذ بالله من الشيطان الرجيم');
const BASMALA = toWords('بسم الله الرحمن الرحيم');
const SADAQA = toWords('صدق الله العظيم');
const AMIN = toWords('آمين');

function phraseAt(words: string[], phrase: string[], offset: number): boolean {
  if (offset < 0 || words.length - offset < phrase.length) return false;
  let score = 0;
  for (let i = 0; i < phrase.length; i++) score += similarity(words[offset + i], phrase[i]);
  return score / phrase.length >= 0.7;
}

export type FormulaOptions = {
  /** Der erwartete Text beginnt selbst mit der Basmala (Al-Fatiha, Vers 1). */
  expectedStartsWithBasmala: boolean;
  /** Der erwartete Text endet mit dem letzten Vers von Al-Fatiha (danach ist „Amin“ üblich). */
  endsWithFatiha?: boolean;
};

/**
 * Bereich der erkannten Wörter ohne Isti‘adha („A‘udhu billah …“) und – wenn der erwartete Text nicht
 * selbst damit beginnt – ohne Basmala am Anfang, „Sadaqa llahu l-‘azim“ am Ende und „Amin“ nach
 * Al-Fatiha. Diese gehören nicht zum Vers und sind kein Fehler.
 */
export function formulaRange(heard: (string | Token)[], opts: FormulaOptions | boolean): { from: number; to: number } {
  const o: FormulaOptions = typeof opts === 'boolean' ? { expectedStartsWithBasmala: opts } : opts;
  const words = heard.map((h) => (typeof h === 'string' ? h : h.norm));
  let from = 0;
  let to = words.length;
  if (phraseAt(words, ISTIADHA, from)) from += ISTIADHA.length;
  if (!o.expectedStartsWithBasmala && phraseAt(words, BASMALA, from)) from += BASMALA.length;
  if (to - from >= SADAQA.length && phraseAt(words, SADAQA, to - SADAQA.length)) to -= SADAQA.length;
  if (o.endsWithFatiha && to - from >= 1 && words[to - 1] === AMIN[0]) to -= 1;
  return { from, to };
}

export function stripFormulas<T extends string | Token>(heard: T[], opts: FormulaOptions | boolean): T[] {
  const { from, to } = formulaRange(heard, opts);
  return heard.slice(from, to);
}

// Kosten der Editierschritte
const SUB_SIMILAR = 0.7; // anderes, aber ähnliches Wort
const SUB = 1; // ganz anderes Wort
const DEL = 1; // ausgelassenes Wort
const INS = 1; // zusätzliches Wort
const REPEAT = 0.4; // Wiederholung eines eben rezitierten Wortes
const JOIN = 0.1; // Zusammen-/Getrenntschreibung
const REPEAT_WINDOW = 10;

const enum Move {
  Diag = 1,
  Del = 2,
  Ins = 3,
  /** zwei erkannte Wörter → ein erwartetes */
  JoinHeard = 4,
  /** ein erkanntes Wort → zwei erwartete */
  JoinExpected = 5,
}

const asToken = (h: string | Token): Token => (typeof h === 'string' ? { raw: h, norm: h } : h);

export function alignWords(expected: string[], heardIn: (string | Token)[]): Alignment {
  const heard = heardIn.map(asToken);
  const n = expected.length;
  const m = heard.length;
  const exp = expected.map(matchForm);
  const hf = heard.map((h) => matchForm(h.norm));

  const isRepeat = (i: number, j: number) => {
    // erkanntes Wort j entspricht einem der zuletzt erreichten erwarteten Wörter
    for (let k = Math.max(0, i - REPEAT_WINDOW); k < i; k++) if (exp[k] === hf[j]) return true;
    return false;
  };
  const subCost = (i: number, j: number) => {
    if (exp[i] === hf[j]) return 0;
    return similarity(exp[i], hf[j]) >= 0.5 ? SUB_SIMILAR : SUB;
  };

  // cost[i][j]: beste Kosten für expected[0..i) gegen heard[0..j)
  const cost: Float64Array[] = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const move: Uint8Array[] = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) {
    cost[i][0] = i * DEL;
    move[i][0] = Move.Del;
  }
  for (let j = 1; j <= m; j++) {
    cost[0][j] = j * INS;
    move[0][j] = Move.Ins;
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      let best = cost[i - 1][j - 1] + subCost(i - 1, j - 1);
      let mv = Move.Diag;
      const del = cost[i - 1][j] + DEL;
      if (del < best) {
        best = del;
        mv = Move.Del;
      }
      const ins = cost[i][j - 1] + (isRepeat(i, j - 1) ? REPEAT : INS);
      if (ins < best) {
        best = ins;
        mv = Move.Ins;
      }
      if (j >= 2 && hf[j - 2] + hf[j - 1] === exp[i - 1]) {
        const c = cost[i - 1][j - 2] + JOIN;
        if (c < best) {
          best = c;
          mv = Move.JoinHeard;
        }
      }
      if (i >= 2 && exp[i - 2] + exp[i - 1] === hf[j - 1]) {
        const c = cost[i - 2][j - 1] + JOIN;
        if (c < best) {
          best = c;
          mv = Move.JoinExpected;
        }
      }
      cost[i][j] = best;
      move[i][j] = mv;
    }
  }

  // Freies Ende: noch nicht rezitierte Wörter am Schluss kosten nichts.
  // Bei Gleichstand das weiteste Ende wählen (Fortschritt).
  let bestI = 0;
  for (let i = 0; i <= n; i++) {
    if (cost[i][m] <= cost[bestI][m] + 1e-9) bestI = i;
  }

  const status: WordStatus[] = new Array(n).fill('pending');
  const heardFor: (string | null)[] = new Array(n).fill(null);
  const heardAt: number[] = new Array(n).fill(-1);
  const extras: Extra[] = [];
  let i = bestI;
  let j = m;
  while (i > 0 || j > 0) {
    const mv = move[i][j];
    if (mv === Move.Diag) {
      const ok = exp[i - 1] === hf[j - 1];
      status[i - 1] = ok ? 'correct' : 'wrong';
      if (!ok) heardFor[i - 1] = heard[j - 1].raw;
      heardAt[i - 1] = j - 1;
      i--;
      j--;
    } else if (mv === Move.Del) {
      status[i - 1] = 'missing';
      i--;
    } else if (mv === Move.Ins) {
      extras.unshift({ before: i, word: heard[j - 1].raw, kind: isRepeat(i, j - 1) ? 'repeat' : 'extra', heardIndex: j - 1 });
      j--;
    } else if (mv === Move.JoinHeard) {
      status[i - 1] = 'correct';
      heardAt[i - 1] = j - 2;
      i--;
      j -= 2;
    } else {
      status[i - 1] = 'correct';
      status[i - 2] = 'correct';
      heardAt[i - 1] = j - 1;
      heardAt[i - 2] = j - 1;
      i -= 2;
      j--;
    }
  }

  // Selbstkorrektur: ein zusätzliches Wort, auf das sofort die Wiederholung folgt
  // („… رب الكافرين رب العالمين“) oder das dem folgenden erwarteten Wort ähnelt („نرزقهم نرزقكم“).
  for (let k = 0; k < extras.length; k++) {
    const e = extras[k];
    if (e.kind !== 'extra') continue;
    const next = extras[k + 1];
    const followedByRepeat = next && next.kind === 'repeat' && next.heardIndex === e.heardIndex + 1;
    const nextExpected = e.before < n ? exp[e.before] : null;
    const nearMiss =
      nextExpected !== null && heardAt[e.before] === e.heardIndex + 1 && similarity(nextExpected, hf[e.heardIndex]) >= 0.5;
    if (followedByRepeat || nearMiss) e.kind = 'corrected';
  }

  return { status, heardFor, heardAt, extras, reached: bestI };
}

/**
 * Gegenprobe: Dieselben Abschnitte wurden ein zweites Mal (mit anderem Suchverfahren) erkannt.
 * Hält die Gegenprobe ein als falsch markiertes Wort für richtig, ist die Erkennung sich nicht
 * sicher – das Wort wird als „unsicher“ markiert (bitte anhören) statt als Fehler.
 */
export function combineOpinions(primary: Alignment, second: Alignment): Alignment {
  const status = primary.status.map((s, i) =>
    (s === 'wrong' || s === 'missing') && second.status[i] === 'correct' ? ('uncertain' as const) : s,
  );
  const confirmed = new Set(second.extras.filter((e) => e.kind === 'extra').map((e) => `${e.before}|${e.word}`));
  const extras = primary.extras.map((e) =>
    e.kind === 'extra' && !confirmed.has(`${e.before}|${e.word}`) ? { ...e, uncertain: true } : e,
  );
  return { ...primary, status, extras };
}

export type Summary = {
  total: number;
  reached: number;
  correct: number;
  wrong: number;
  missing: number;
  uncertain: number;
  /** zusätzliche Wörter (Fehler) */
  extra: number;
  /** Wiederholungen und sofortige Selbstkorrekturen (kein Fehler) */
  repeats: number;
  corrected: number;
};

export function summarize(a: Alignment): Summary {
  let correct = 0;
  let wrong = 0;
  let missing = 0;
  let uncertain = 0;
  for (const s of a.status) {
    if (s === 'correct') correct++;
    else if (s === 'wrong') wrong++;
    else if (s === 'missing') missing++;
    else if (s === 'uncertain') uncertain++;
  }
  let extra = 0;
  let repeats = 0;
  let corrected = 0;
  for (const e of a.extras) {
    if (e.kind === 'repeat') repeats++;
    else if (e.kind === 'corrected') corrected++;
    else if (e.uncertain) uncertain++;
    else extra++;
  }
  return { total: a.status.length, reached: a.reached, correct, wrong, missing, uncertain, extra, repeats, corrected };
}
