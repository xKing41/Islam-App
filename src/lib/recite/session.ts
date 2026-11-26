/**
 * Auswertung einer Rezitation aus mehreren Aufnahme-Abschnitten: Wortabgleich, Zuordnung der Wörter zu
 * den Abschnitten (für „Meine Aufnahme anhören“ und die Gegenprobe) und Abschluss beim Stoppen.
 *
 * Rein rechnerisch, ohne React-Native-Abhängigkeiten (mit Unit-Tests geprüft).
 */
import { alignRecitation, applyVocabulary, combineOpinions, type Alignment, type FormulaOptions, type Token } from './align';

export type RecitedSegment = {
  /** Erkannte Wörter (Hauptdurchgang) */
  tokens: Token[];
  /** Erkannte Wörter der Gegenprobe – nur für Abschnitte mit markierten Wörtern */
  alt?: Token[];
};

export type SessionResult = {
  alignment: Alignment;
  /** Für jedes erkannte Wort (nach Entfernen von Isti‘adha/Basmala …): Index des Abschnitts */
  segOfHeard: number[];
};

export function evaluateSession(
  expected: string[],
  segments: RecitedSegment[],
  opts: FormulaOptions,
  isQuranWord?: (norm: string) => boolean,
): SessionResult {
  const all: Token[] = [];
  const segOf: number[] = [];
  segments.forEach((s, k) =>
    s.tokens.forEach((t) => {
      all.push(t);
      segOf.push(k);
    }),
  );
  const { alignment: primary, from } = alignRecitation(expected, all, opts);
  let alignment = primary;
  if (segments.some((s) => s.alt)) {
    const alt: Token[] = [];
    for (const s of segments) alt.push(...(s.alt ?? s.tokens));
    alignment = combineOpinions(primary, alignRecitation(expected, alt, opts).alignment);
  }
  if (isQuranWord) alignment = applyVocabulary(alignment, isQuranWord);
  return { alignment, segOfHeard: segOf.slice(from) };
}

/** Abschnitte, die zu erwarteten Wörtern im Bereich [from, to) gehören (inkl. zusätzlicher Wörter dort). */
export function segmentsForRange(res: SessionResult, from: number, to: number): number[] {
  const { alignment: a, segOfHeard } = res;
  const set = new Set<number>();
  for (let i = from; i < to; i++) {
    const h = a.heardAt[i];
    if (h >= 0 && segOfHeard[h] !== undefined) set.add(segOfHeard[h]);
  }
  for (const e of a.extras) {
    // ein zusätzliches Wort gehört zum Vers des davor stehenden Wortes
    const owner = e.before > 0 ? e.before - 1 : 0;
    if (owner >= from && owner < to && segOfHeard[e.heardIndex] !== undefined) set.add(segOfHeard[e.heardIndex]);
  }
  if (!set.size) return [];
  // lückenlos vom ersten bis zum letzten Abschnitt (ausgelassene Wörter liegen dazwischen)
  const sorted = [...set].sort((x, y) => x - y);
  const out: number[] = [];
  for (let k = sorted[0]; k <= sorted[sorted.length - 1]; k++) out.push(k);
  return out;
}

/** Abschnitte mit falschen, ausgelassenen oder zusätzlichen Wörtern – Kandidaten für die Gegenprobe. */
export function segmentsWithFlags(res: SessionResult): number[] {
  const { alignment: a, segOfHeard } = res;
  const set = new Set<number>();
  const segNear = (i: number): number | undefined => {
    for (let d = 0; d < a.heardAt.length; d++) {
      for (const k of [i - d, i + d]) {
        if (k >= 0 && k < a.heardAt.length && a.heardAt[k] >= 0) return segOfHeard[a.heardAt[k]];
      }
    }
    return undefined;
  };
  a.status.forEach((s, i) => {
    if (s === 'wrong' || s === 'missing') {
      const seg = s === 'wrong' ? segOfHeard[a.heardAt[i]] : segNear(i);
      if (seg !== undefined) set.add(seg);
    }
  });
  for (const e of a.extras) if (e.kind === 'extra' && segOfHeard[e.heardIndex] !== undefined) set.add(segOfHeard[e.heardIndex]);
  return [...set].sort((x, y) => x - y);
}

/**
 * Nach dem Stoppen: Wörter des angefangenen Verses, die nicht mehr rezitiert wurden, gelten als
 * ausgelassen („Vers unvollständig“). Spätere Verse bleiben offen – sie waren nicht Teil des Versuchs.
 */
export function finishAlignment(a: Alignment, ayat: { from: number; to: number }[]): Alignment {
  if (a.reached === 0) return a;
  const verse = ayat.find((v) => a.reached > v.from && a.reached < v.to);
  if (!verse) return a;
  const status = a.status.slice();
  for (let i = a.reached; i < verse.to; i++) if (status[i] === 'pending') status[i] = 'missing';
  return { ...a, status };
}

/** Verpackt 16-Bit-PCM (mono) als WAV-Datei, z. B. zum Anhören der eigenen Aufnahme. */
export function pcmToWav(pcm: Int16Array, sampleRate = 16000): Uint8Array {
  const out = new Uint8Array(44 + pcm.length * 2);
  const v = new DataView(out.buffer);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i);
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + 2 * i, pcm[i], true);
  return out;
}
