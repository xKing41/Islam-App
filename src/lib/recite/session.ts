/**
 * Auswertung einer Rezitation aus mehreren Aufnahme-Abschnitten: Wortabgleich, Zuordnung der Wörter zu
 * den Abschnitten (für „Meine Aufnahme anhören“ und die Gegenprobe) und Abschluss beim Stoppen.
 *
 * Rein rechnerisch, ohne React-Native-Abhängigkeiten (mit Unit-Tests geprüft).
 */
import { alignRecitation, applyVocabulary, combineOpinions, tokenize, type Alignment, type FormulaOptions, type Token } from './align';

export type RecitedSegment = {
  /** Erkannte Wörter (Hauptdurchgang) */
  tokens: Token[];
  /** Erkannte Wörter der Gegenprobe – nur für Abschnitte mit markierten Wörtern */
  alt?: Token[];
  /** Nachhören in zwei Hälften – nur für Abschnitte, in denen Wörter zu fehlen scheinen */
  split?: Token[];
  /** Zusammenhören: dieser und der nächste Abschnitt gemeinsam erkannt (bei Markierungen an der Schnittstelle) */
  withNext?: Token[];
};

export type SessionResult = {
  alignment: Alignment;
  /** Die verwendeten erkannten Wörter (Hauptdurchgang, ohne Isti‘adha usw.) – Index wie in alignment.heardAt */
  heard: Token[];
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
  if (segments.some((s) => s.split)) {
    // Nachhören: Hört die Erkennung in den Hälften ein „ausgelassenes“ Wort, hatte sie es zuvor nur
    // übersprungen (passiert bei längeren Abschnitten und wiederholten Phrasen) – dann zählt es als
    // rezitiert. Nur für Auslassungen; falsche Wörter werden dadurch nicht verändert.
    const split: Token[] = [];
    for (const s of segments) split.push(...(s.split ?? s.tokens));
    const again = alignRecitation(expected, split, opts).alignment;
    const status = alignment.status.map((st, i) =>
      primary.status[i] === 'missing' && again.status[i] === 'correct' ? ('correct' as const) : st,
    );
    alignment = { ...alignment, status };
  }
  if (segments.some((s) => s.withNext)) alignment = applyMerged(expected, segments, opts, alignment, segOf.slice(from));
  if (isQuranWord) alignment = applyVocabulary(alignment, isQuranWord);
  return { alignment, heard: all.slice(from), segOfHeard: segOf.slice(from) };
}

/**
 * Für ein markiertes Wort: das Abschnittspaar (p, p+1), dessen gemeinsame Erkennung es klären kann –
 * der Nachbar auf der Seite, auf der das Wort im Abschnitt liegt (vorne → mit dem vorigen, hinten → mit
 * dem nächsten Abschnitt). null, wenn es keinen Nachbarn gibt.
 */
export function pairForWord(a: Alignment, segOfHeard: number[], segCount: number, i: number, heardIndex?: number): number | null {
  let h = heardIndex ?? a.heardAt[i];
  if (h === undefined || h < 0) {
    // ausgelassenes Wort: nächstes zugeordnetes Wort davor oder danach
    for (let d = 1; d < a.heardAt.length && (h === undefined || h < 0); d++) {
      for (const k of [i - d, i + d]) {
        if (k >= 0 && k < a.heardAt.length && a.heardAt[k] >= 0) {
          h = a.heardAt[k];
          break;
        }
      }
    }
  }
  if (h === undefined || h < 0) return null;
  const seg = segOfHeard[h];
  if (seg === undefined) return null;
  let first = h;
  while (first > 0 && segOfHeard[first - 1] === seg) first--;
  let last = h;
  while (last + 1 < segOfHeard.length && segOfHeard[last + 1] === seg) last++;
  const front = h - first < last - h;
  if (front && seg > 0) return seg - 1;
  if (!front && seg + 1 < segCount) return seg;
  if (seg > 0) return seg - 1;
  return seg + 1 < segCount ? seg : null;
}

/**
 * Zusammenhören: Ein Schnitt zwischen zwei Abschnitten mitten im Vers ist die häufigste Ursache für
 * Fehlalarme (ganze Verse in einem Stück erkennt das Modell fast fehlerfrei). Wurden zwei Abschnitte
 * gemeinsam noch einmal erkannt und hört die Erkennung dort das erwartete Wort, gilt: „ausgelassen“
 * entfällt, „falsch“ wird zu „unsicher“ (nie zu „richtig“ – echte Fehler bleiben sichtbar), ein
 * zusätzliches Wort, das die gemeinsame Erkennung nicht hört, wird ebenfalls „unsicher“.
 */
function applyMerged(expected: string[], segments: RecitedSegment[], opts: FormulaOptions, a: Alignment, segOfHeard: number[]): Alignment {
  const cache = new Map<number, Alignment>();
  const pairAlign = (p: number) => {
    if (!cache.has(p)) {
      const toks: Token[] = [];
      segments.forEach((s, k) => {
        if (k === p) toks.push(...(s.withNext ?? []));
        else if (k !== p + 1) toks.push(...s.tokens);
      });
      cache.set(p, alignRecitation(expected, toks, opts).alignment);
    }
    return cache.get(p)!;
  };
  const status = a.status.slice();
  a.status.forEach((st, i) => {
    if (st !== 'wrong' && st !== 'missing') return;
    const p = pairForWord(a, segOfHeard, segments.length, i);
    if (p === null || !segments[p]?.withNext) return;
    if (pairAlign(p).status[i] !== 'correct') return;
    status[i] = st === 'missing' ? 'correct' : 'uncertain';
  });
  const extras = a.extras.map((e) => {
    if (e.kind !== 'extra' || e.uncertain) return e;
    const p = pairForWord(a, segOfHeard, segments.length, -1, e.heardIndex);
    if (p === null || !segments[p]?.withNext) return e;
    const w = tokenize(e.word)[0]?.norm;
    const confirmed = pairAlign(p).extras.some((x) => x.kind === 'extra' && Math.abs(x.before - e.before) <= 1 && tokenize(x.word)[0]?.norm === w);
    return confirmed ? e : { ...e, uncertain: true };
  });
  return { ...a, status, extras };
}

/** Abschnittspaare, deren gemeinsame Erkennung markierte Wörter klären könnte – Kandidaten fürs Zusammenhören. */
export function pairsToMerge(res: SessionResult, segCount: number): number[] {
  const { alignment: a, segOfHeard } = res;
  const set = new Set<number>();
  a.status.forEach((st, i) => {
    if (st !== 'wrong' && st !== 'missing') return;
    const p = pairForWord(a, segOfHeard, segCount, i);
    if (p !== null) set.add(p);
  });
  for (const e of a.extras) {
    if (e.kind !== 'extra') continue;
    const p = pairForWord(a, segOfHeard, segCount, -1, e.heardIndex);
    if (p !== null) set.add(p);
  }
  return [...set].sort((x, y) => x - y);
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

/** Abschnitte, an die ausgelassene Wörter grenzen – Kandidaten für das Nachhören in zwei Hälften. */
export function segmentsWithGaps(res: SessionResult): number[] {
  const { alignment: a, segOfHeard } = res;
  const set = new Set<number>();
  a.status.forEach((s, i) => {
    if (s !== 'missing') return;
    for (const dir of [-1, 1]) {
      for (let k = i + dir; k >= 0 && k < a.status.length; k += dir) {
        if (a.heardAt[k] >= 0) {
          const seg = segOfHeard[a.heardAt[k]];
          if (seg !== undefined) set.add(seg);
          break;
        }
      }
    }
  });
  return [...set].sort((x, y) => x - y);
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
