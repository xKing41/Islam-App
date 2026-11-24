/**
 * Abgleich der erkannten Wörter mit dem erwarteten Korantext (Wort für Wort).
 *
 * Verfahren: Editierdistanz auf Wortebene (wie bei der Wortfehlerrate), wobei zwei Wörter als gleich
 * gelten, wenn sie nach dem Vereinheitlichen (ohne Vokalzeichen, Alif-/Hamza-Varianten …) sehr
 * ähnlich sind. Am Ende des erwarteten Textes ist die Lücke „kostenlos“ – noch nicht rezitierte
 * Wörter gelten als offen, nicht als Fehler.
 *
 * Rein rechnerisch, ohne React-Native-Abhängigkeiten (wird mit Unit-Tests geprüft).
 */
import { normalizeArabic } from '../quran/text';

export type WordStatus = 'pending' | 'correct' | 'wrong' | 'missing';

export type Alignment = {
  /** Status je erwartetem Wort. */
  status: WordStatus[];
  /** Was statt eines falschen Wortes gehört wurde. */
  heardFor: (string | null)[];
  /** Zusätzlich gehörte Wörter, jeweils vor dem erwarteten Wort mit Index `before`. */
  extras: { before: number; word: string }[];
  /** Anzahl erwarteter Wörter, die bereits „erreicht“ wurden (Fortschritt). */
  reached: number;
};

/** Ab dieser Ähnlichkeit gilt ein Wort als richtig rezitiert (kleine Schreibunterschiede erlaubt). */
export const MATCH_THRESHOLD = 0.75;

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

/** Ähnlichkeit zweier Wörter zwischen 0 und 1 (nach dem Vereinheitlichen). */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/** Zerlegt arabischen Text in vereinheitlichte Wörter. */
export function toWords(text: string): string[] {
  return normalizeArabic(text)
    .replace(/[^ء-ي\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

const ISTIADHA = toWords('أعوذ بالله من الشيطان الرجيم');
const BASMALA = toWords('بسم الله الرحمن الرحيم');
const SADAQA = toWords('صدق الله العظيم');

function startsWithPhrase(words: string[], phrase: string[], offset = 0): boolean {
  if (words.length - offset < phrase.length) return false;
  let score = 0;
  for (let i = 0; i < phrase.length; i++) score += similarity(words[offset + i], phrase[i]);
  return score / phrase.length >= 0.7;
}

/**
 * Entfernt Isti‘adha („A‘udhu billah …“) und – wenn der erwartete Text nicht selbst damit beginnt –
 * die Basmala am Anfang sowie „Sadaqa llahu l-‘azim“ am Ende. Diese sind kein Fehler.
 */
export function stripFormulas(heard: string[], expectedStartsWithBasmala: boolean): string[] {
  let w = heard;
  if (startsWithPhrase(w, ISTIADHA)) w = w.slice(ISTIADHA.length);
  if (!expectedStartsWithBasmala && startsWithPhrase(w, BASMALA)) w = w.slice(BASMALA.length);
  if (w.length >= SADAQA.length && startsWithPhrase(w, SADAQA, w.length - SADAQA.length)) {
    w = w.slice(0, w.length - SADAQA.length);
  }
  return w;
}

export function alignWords(expected: string[], heard: string[]): Alignment {
  const n = expected.length;
  const m = heard.length;
  const INS = 1; // zusätzliches Wort
  const DEL = 1; // ausgelassenes Wort
  const subCost = (i: number, j: number) => {
    const s = similarity(expected[i], heard[j]);
    return s >= MATCH_THRESHOLD ? 0 : s >= 0.5 ? 0.7 : 1;
  };

  // cost[i][j]: beste Kosten für expected[0..i) gegen heard[0..j)
  const cost: Float64Array[] = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const move: Uint8Array[] = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1)); // 1=diag 2=del 3=ins
  for (let i = 1; i <= n; i++) {
    cost[i][0] = i * DEL;
    move[i][0] = 2;
  }
  for (let j = 1; j <= m; j++) {
    cost[0][j] = j * INS;
    move[0][j] = 3;
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = cost[i - 1][j - 1] + subCost(i - 1, j - 1);
      const del = cost[i - 1][j] + DEL;
      const ins = cost[i][j - 1] + INS;
      if (diag <= del && diag <= ins) {
        cost[i][j] = diag;
        move[i][j] = 1;
      } else if (del <= ins) {
        cost[i][j] = del;
        move[i][j] = 2;
      } else {
        cost[i][j] = ins;
        move[i][j] = 3;
      }
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
  const extras: { before: number; word: string }[] = [];
  let i = bestI;
  let j = m;
  while (i > 0 || j > 0) {
    const mv = move[i][j];
    if (mv === 1) {
      const ok = similarity(expected[i - 1], heard[j - 1]) >= MATCH_THRESHOLD;
      status[i - 1] = ok ? 'correct' : 'wrong';
      if (!ok) heardFor[i - 1] = heard[j - 1];
      i--;
      j--;
    } else if (mv === 2) {
      status[i - 1] = 'missing';
      i--;
    } else {
      extras.unshift({ before: i, word: heard[j - 1] });
      j--;
    }
  }
  return { status, heardFor, extras, reached: bestI };
}

export type Summary = { total: number; reached: number; correct: number; wrong: number; missing: number; extra: number };

export function summarize(a: Alignment): Summary {
  let correct = 0;
  let wrong = 0;
  let missing = 0;
  for (const s of a.status) {
    if (s === 'correct') correct++;
    else if (s === 'wrong') wrong++;
    else if (s === 'missing') missing++;
  }
  return { total: a.status.length, reached: a.reached, correct, wrong, missing, extra: a.extras.length };
}
