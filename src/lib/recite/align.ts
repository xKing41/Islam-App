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

export type ExtraKind = 'extra' | 'corrected';

export type Extra = {
  /** Steht vor dem erwarteten Wort mit diesem Index. */
  before: number;
  word: string;
  /** extra = zusätzliches Wort (Fehler), corrected = Versprecher, den die Person sofort selbst korrigiert hat. */
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
  /** Wie oft neu angesetzt wurde (Wiederholung bereits rezitierter Wörter – kein Fehler). */
  repeats: number;
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
const JUMP = 0.5; // Neuansatz: zurück an eine frühere Stelle und von dort noch einmal
const JOIN = 0.1; // Zusammen-/Getrenntschreibung

const enum Move {
  Diag = 1,
  Del = 2,
  Ins = 3,
  /** zwei erkannte Wörter → ein erwartetes */
  JoinHeard = 4,
  /** ein erkanntes Wort → zwei erwartete */
  JoinExpected = 5,
  /** Sprung zurück (Wiederholung) */
  Jump = 6,
}

const asToken = (h: string | Token): Token => (typeof h === 'string' ? { raw: h, norm: h } : h);

/**
 * Ordnet die erkannten Wörter den erwarteten zu. Wiederholungen werden als Sprung zurück modelliert:
 * Wer neu ansetzt („… رب الكافرين | رب العالمين …“ oder eine ganze Phrase noch einmal), wird nicht
 * mit zusätzlichen Wörtern bestraft. Für jedes Wort zählt der letzte Durchgang; ein falscher früherer
 * Versuch, der danach richtig wiederholt wurde, erscheint als „selbst korrigiert“.
 */
export function alignWords(expected: string[], heardIn: (string | Token)[]): Alignment {
  const heard = heardIn.map(asToken);
  const n = expected.length;
  const m = heard.length;
  const exp = expected.map(matchForm);
  const hf = heard.map((h) => matchForm(h.norm));
  const subCost = (i: number, j: number) => {
    if (exp[i] === hf[j]) return 0;
    return similarity(exp[i], hf[j]) >= 0.5 ? SUB_SIMILAR : SUB;
  };

  // cost[i][j]: beste Kosten, nachdem heard[0..j) verarbeitet wurde und man bei expected[i] steht
  const cost: Float64Array[] = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const move: Uint8Array[] = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  const jumpFrom: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = 1; i <= n; i++) {
    cost[i][0] = i * DEL;
    move[i][0] = Move.Del;
  }
  const orig = new Float64Array(n + 1);
  for (let j = 1; j <= m; j++) {
    cost[0][j] = cost[0][j - 1] + INS;
    move[0][j] = Move.Ins;
    for (let i = 1; i <= n; i++) {
      let best = cost[i - 1][j - 1] + subCost(i - 1, j - 1);
      let mv = Move.Diag;
      const del = cost[i - 1][j] + DEL;
      if (del < best) {
        best = del;
        mv = Move.Del;
      }
      const ins = cost[i][j - 1] + INS;
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
    // Neuansatz: von einer späteren Stelle i' zurück an eine frühere Stelle k (ohne erkanntes Wort)
    for (let i = 0; i <= n; i++) orig[i] = cost[i][j];
    let bestRight = Infinity;
    let bestRightI = -1;
    for (let k = n; k >= 0; k--) {
      if (bestRight + JUMP < cost[k][j]) {
        cost[k][j] = bestRight + JUMP;
        move[k][j] = Move.Jump;
        jumpFrom[k][j] = bestRightI;
      }
      if (orig[k] < bestRight) {
        bestRight = orig[k];
        bestRightI = k;
      }
    }
  }

  // Freies Ende: noch nicht rezitierte Wörter am Schluss kosten nichts.
  // Bei Gleichstand das weiteste Ende wählen (Fortschritt).
  let bestI = 0;
  for (let i = 0; i <= n; i++) {
    if (cost[i][m] <= cost[bestI][m] + 1e-9) bestI = i;
  }

  // Rückverfolgung (rückwärts in der Zeit): Für jedes Wort zählt der späteste Durchgang.
  const status: WordStatus[] = new Array(n).fill('pending');
  const assigned = new Uint8Array(n);
  const heardFor: (string | null)[] = new Array(n).fill(null);
  const heardAt: number[] = new Array(n).fill(-1);
  const extras: Extra[] = [];
  let repeats = 0;
  let reached = bestI;
  let nextInTime = 0; // Schritt, der zeitlich unmittelbar danach kam
  let i = bestI;
  let j = m;
  const take = (k: number, st: WordStatus, h: number) => {
    if (assigned[k]) return false;
    assigned[k] = 1;
    status[k] = st;
    if (h >= 0) heardAt[k] = h;
    return true;
  };
  while (i > 0 || j > 0) {
    reached = Math.max(reached, i);
    const mv = move[i][j];
    if (mv === Move.Jump) {
      repeats++;
      i = jumpFrom[i][j];
      nextInTime = Move.Jump;
      continue;
    }
    if (mv === Move.Diag) {
      const ok = exp[i - 1] === hf[j - 1];
      if (take(i - 1, ok ? 'correct' : 'wrong', j - 1)) {
        if (!ok) heardFor[i - 1] = heard[j - 1].raw;
      } else if (!ok && status[i - 1] === 'correct') {
        // früherer, falscher Versuch – später richtig wiederholt
        extras.unshift({ before: i - 1, word: heard[j - 1].raw, kind: 'corrected', heardIndex: j - 1 });
      }
      i--;
      j--;
    } else if (mv === Move.Del) {
      take(i - 1, 'missing', -1);
      i--;
    } else if (mv === Move.Ins) {
      extras.unshift({ before: i, word: heard[j - 1].raw, kind: nextInTime === Move.Jump ? 'corrected' : 'extra', heardIndex: j - 1 });
      j--;
    } else if (mv === Move.JoinHeard) {
      take(i - 1, 'correct', j - 2);
      i--;
      j -= 2;
    } else {
      take(i - 1, 'correct', j - 1);
      take(i - 2, 'correct', j - 1);
      i -= 2;
      j--;
    }
    nextInTime = mv;
  }

  // Echo: ein zusätzliches Wort direkt nach einem Wort, dem es fast gleicht („الذِّكْرِ ذَكْرِ“) – ein
  // angesetztes Wort oder ein Doppel-Hören der Erkennung, kein eingefügtes Wort.
  for (const e of extras) {
    if (e.kind !== 'extra' || e.before < 1) continue;
    const prev = e.before - 1;
    const w = hf[e.heardIndex];
    const echo = similarity(exp[prev], w) >= 0.75 || (w.length >= 3 && exp[prev].endsWith(w));
    if (heardAt[prev] === e.heardIndex - 1 && status[prev] === 'correct' && echo) e.kind = 'corrected';
  }

  // Selbstkorrektur ohne Neuansatz: ein zusätzliches Wort, das dem unmittelbar folgenden (richtig
  // erkannten) erwarteten Wort ähnelt – „نرزقهم نرزقكم“.
  for (const e of extras) {
    if (e.kind !== 'extra' || e.before >= n) continue;
    const next = heardAt[e.before];
    if (next === e.heardIndex + 1 && status[e.before] === 'correct' && similarity(exp[e.before], hf[e.heardIndex]) >= 0.5) e.kind = 'corrected';
  }
  extras.sort((x, y) => x.heardIndex - y.heardIndex);

  return { status, heardFor, heardAt, extras, reached, repeats };
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

/**
 * Abgleich einer ganzen Rezitation mit allen Sonderfällen:
 * - Isti‘adha, Basmala vor einer Sure, „Sadaqa llahu l-‘azim“ und „Amin“ werden übergangen (formulaRange);
 * - bei Al-Fatiha ab Vers 1 ist die Basmala freiwillig (in der hanafitischen Schule wird sie still
 *   gesprochen) – fehlt sie, bleibt sie neutral statt „ausgelassen“;
 * - nach dem letzten Vers von Al-Fatiha werden bis zu zwei weitere Wörter übergangen („Amin“, das die
 *   Erkennung oft als anderes Wort hört).
 * `from` ist der Index des ersten verwendeten erkannten Wortes (für die Zuordnung zu Abschnitten).
 */
export function alignRecitation(expected: string[], heard: Token[], opts: FormulaOptions): { alignment: Alignment; from: number } {
  const { from, to } = formulaRange(heard, opts);
  const used = heard.slice(from, to);
  const skip =
    opts.expectedStartsWithBasmala && expected.length > BASMALA.length && used.length > 0 && !phraseAt(used.map((t) => t.norm), BASMALA, 0)
      ? BASMALA.length
      : 0;
  let a = alignWords(expected.slice(skip), used);
  if (skip) {
    a = {
      status: [...new Array<WordStatus>(skip).fill('pending'), ...a.status],
      heardFor: [...new Array<string | null>(skip).fill(null), ...a.heardFor],
      heardAt: [...new Array<number>(skip).fill(-1), ...a.heardAt],
      extras: a.extras.map((e) => ({ ...e, before: e.before + skip })),
      reached: a.reached + skip,
      repeats: a.repeats,
    };
  }
  if (opts.endsWithFatiha && a.reached === expected.length) {
    const trailing = a.extras.filter((e) => e.before === expected.length);
    if (trailing.length > 0 && trailing.length <= 2) a = { ...a, extras: a.extras.filter((e) => e.before !== expected.length) };
  }
  return { alignment: a, from };
}

/**
 * Wortschatz-Regel: Wer auswendig rezitiert und sich vertut, sagt fast immer ein anderes echtes Koranwort
 * (z. B. „نرزقهم“ statt „نرزقكم“). Ein erkanntes Wort, das so nirgends im Koran vorkommt, ist dagegen
 * meist ein Hörfehler der Erkennung (oder eine Frage der Aussprache) – es wird als „unsicher“ markiert
 * (bitte anhören) statt als Fehler.
 */
export function applyVocabulary(a: Alignment, isQuranWord: (norm: string) => boolean): Alignment {
  const known = (raw: string | null) => {
    const t = raw ? tokenize(raw) : [];
    return t.length > 0 && t.every((x) => isQuranWord(x.norm));
  };
  const status = a.status.map((st, i) => (st === 'wrong' && !known(a.heardFor[i]) ? ('uncertain' as const) : st));
  const extras = a.extras.map((e) => (e.kind === 'extra' && !e.uncertain && !known(e.word) ? { ...e, uncertain: true } : e));
  return { ...a, status, extras };
}

/**
 * Vokalzeichen eines Wortes je Buchstabe, z. B. „الْحَمْدُ“ → „ا: ل: ح:َ م: د:ُ“. Nicht verglichen werden
 * Sukun (wird uneinheitlich geschrieben), die Schadda auf dem ersten Buchstaben (zeigt nur die
 * Angleichung an das Wort davor) und auf Wunsch die Endung (am Versende wird sie nicht gesprochen).
 */
export function vowelPattern(word: string, dropFinal = false): string {
  const out: string[] = [];
  const w = word.replace(/\u0640/g, '').replace(/\u0671/g, 'ا').replace(/[\u06D6-\u06ED\u0670]/g, '');
  for (const ch of w) {
    if (/[\u0621-\u064A]/.test(ch)) out.push(`${ch.replace(/[آأإ]/, 'ا')}:`);
    else if (/[\u064B-\u0651]/.test(ch) && out.length) {
      const [l, m] = out[out.length - 1].split(':');
      out[out.length - 1] = `${l}:${[...m, ch].sort().join('')}`;
    }
  }
  if (out.length) out[0] = out[0].replace('\u0651', '');
  if (dropFinal && out.length) out[out.length - 1] = `${out[out.length - 1].split(':')[0]}:`;
  return out.join(' ');
}

/**
 * Vokal-Hinweise: Für richtig erkannte Wörter, deren Vokalzeichen anders gehört wurden als im Mushaf
 * (z. B. „ذِكْرُكَ“ statt „ذِكْرَكَ“), das gehörte Wort – sonst null. Nur ein Hinweis: Die Erkennung hört die
 * Vokale nicht ganz zuverlässig (gemessen: 99,4 % Übereinstimmung bei korrekter Rezitation).
 * Erkannte Wörter ohne Vokalzeichen werden nicht verglichen.
 */
export function vowelHints(a: Alignment, heard: Token[], display: string[], verseEnds: Set<number>): (string | null)[] {
  return a.status.map((st, i) => {
    if (st !== 'correct' || a.heardAt[i] < 0) return null;
    const h = heard[a.heardAt[i]];
    if (!h || !/[\u064B-\u0650]/.test(h.raw)) return null;
    const end = verseEnds.has(i);
    return vowelPattern(display[i] ?? '', end) === vowelPattern(h.raw, end) ? null : h.raw;
  });
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
  /** Neuansätze/Wiederholungen und sofortige Selbstkorrekturen (kein Fehler) */
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
  let corrected = 0;
  for (const e of a.extras) {
    if (e.kind === 'corrected') corrected++;
    else if (e.uncertain) uncertain++;
    else extra++;
  }
  return { total: a.status.length, reached: a.reached, correct, wrong, missing, uncertain, extra, repeats: a.repeats, corrected };
}
