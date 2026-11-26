/**
 * Zerlegt den Mikrofon-Strom anhand von Sprechpausen in Abschnitte (einfache Sprach-Erkennung
 * über die Lautstärke). Jeder fertige Abschnitt wird anschließend erkannt – so gibt es schon
 * während der Rezitation Rückmeldung, Vers für Vers.
 *
 * Rein rechnerisch (Int16-PCM, mono), ohne React-Native-Abhängigkeiten.
 */
export type SegmenterOptions = {
  sampleRate?: number;
  /** Länge eines Analyse-Rahmens. */
  frameMs?: number;
  /** So lange Stille beendet einen Abschnitt. */
  silenceMs?: number;
  /** Kürzere Geräusche werden ignoriert. */
  minSpeechMs?: number;
  /** Ab dieser Länge wird ein Abschnitt an der leisesten Stelle der letzten Sekunden geteilt. */
  softMaxSegmentMs?: number;
  /** Spätestens hier wird ein Abschnitt abgeschnitten (Whisper verarbeitet max. 30 s). */
  maxSegmentMs?: number;
  /** So viel Audio vor dem Sprechbeginn wird mitgenommen. */
  preRollMs?: number;
};

export class Segmenter {
  private readonly frame: number;
  private readonly silenceFrames: number;
  private readonly minSpeechFrames: number;
  private readonly maxFrames: number;
  private readonly softMaxFrames: number;
  private readonly searchFrames: number;
  private readonly preRollFrames: number;

  private pending: number[] = []; // Reste, die noch keinen ganzen Rahmen ergeben
  private preRoll: Int16Array[] = [];
  private current: Int16Array[] = [];
  private currentRms: number[] = [];
  private inSpeech = false;
  private speechFrames = 0;
  private silenceRun = 0;
  private loudRun = 0;
  private noise = 0.004; // geschätzter Grundpegel (RMS, 0..1)
  /** Lautstärke des letzten Rahmens (0..1) – für eine Pegelanzeige. */
  level = 0;

  constructor(opts: SegmenterOptions = {}) {
    const rate = opts.sampleRate ?? 16000;
    const frameMs = opts.frameMs ?? 30;
    this.frame = Math.round((rate * frameMs) / 1000);
    this.silenceFrames = Math.round((opts.silenceMs ?? 800) / frameMs);
    this.minSpeechFrames = Math.round((opts.minSpeechMs ?? 350) / frameMs);
    this.maxFrames = Math.round((opts.maxSegmentMs ?? 28000) / frameMs);
    this.softMaxFrames = Math.round((opts.softMaxSegmentMs ?? 20000) / frameMs);
    this.searchFrames = Math.round(8000 / frameMs);
    this.preRollFrames = Math.round((opts.preRollMs ?? 300) / frameMs);
  }

  get speaking(): boolean {
    return this.inSpeech;
  }

  /** Nimmt neue Samples auf und gibt fertige Abschnitte zurück. */
  push(samples: Int16Array): Int16Array[] {
    const done: Int16Array[] = [];
    let offset = 0;
    // Reste vom letzten Aufruf auffüllen
    if (this.pending.length) {
      const need = this.frame - this.pending.length;
      const take = Math.min(need, samples.length);
      for (let k = 0; k < take; k++) this.pending.push(samples[k]);
      offset = take;
      if (this.pending.length === this.frame) {
        const f = Int16Array.from(this.pending);
        this.pending = [];
        const seg = this.processFrame(f);
        if (seg) done.push(seg);
      }
    }
    while (offset + this.frame <= samples.length) {
      const seg = this.processFrame(samples.slice(offset, offset + this.frame));
      if (seg) done.push(seg);
      offset += this.frame;
    }
    for (let k = offset; k < samples.length; k++) this.pending.push(samples[k]);
    return done;
  }

  /** Gibt den angefangenen Abschnitt zurück (z. B. beim Stoppen). */
  flush(): Int16Array | null {
    const seg = this.inSpeech && this.speechFrames >= this.minSpeechFrames ? concat(this.current) : null;
    this.reset();
    return seg;
  }

  private reset() {
    this.current = [];
    this.currentRms = [];
    this.inSpeech = false;
    this.speechFrames = 0;
    this.silenceRun = 0;
    this.loudRun = 0;
  }

  /**
   * Index des leisesten Rahmens (gleitendes Mittel über 150 ms) in den letzten 8 Sekunden – nicht in den
   * allerletzten 300 ms, damit der neue Abschnitt nicht mitten in einem gerade begonnenen Wort anfängt.
   * Liefert null, wenn noch weiter gesucht werden darf (vor der harten Grenze) und keine ruhige Stelle da ist.
   */
  private quietestPoint(): number | null {
    const n = this.current.length;
    const from = Math.max(Math.round(n / 3), n - this.searchFrames);
    const to = n - 10;
    let best = -1;
    let bestVal = Infinity;
    for (let i = from + 2; i < to - 2; i++) {
      const v = (this.currentRms[i - 2] + this.currentRms[i - 1] + this.currentRms[i] + this.currentRms[i + 1] + this.currentRms[i + 2]) / 5;
      if (v < bestVal) {
        bestVal = v;
        best = i;
      }
    }
    return best > 0 ? best : null;
  }

  private processFrame(f: Int16Array): Int16Array | null {
    const rms = rmsOf(f);
    this.level = Math.min(1, rms * 8);
    const threshold = Math.max(0.012, this.noise * 3);
    const loud = rms > threshold;

    if (!this.inSpeech) {
      // Grundpegel langsam nachführen (nur in leisen Phasen)
      if (!loud) this.noise = this.noise * 0.95 + rms * 0.05;
      this.preRoll.push(f);
      if (this.preRoll.length > this.preRollFrames) this.preRoll.shift();
      this.loudRun = loud ? this.loudRun + 1 : 0;
      if (this.loudRun >= 2) {
        this.inSpeech = true;
        this.current = [...this.preRoll];
        this.currentRms = this.preRoll.map(rmsOf);
        this.preRoll = [];
        this.speechFrames = this.loudRun;
        this.silenceRun = 0;
      }
      return null;
    }

    this.current.push(f);
    this.currentRms.push(rms);
    if (loud) {
      this.speechFrames++;
      this.silenceRun = 0;
    } else {
      this.silenceRun++;
    }
    if (this.silenceRun >= this.silenceFrames) {
      const enough = this.speechFrames >= this.minSpeechFrames;
      const seg = enough ? concat(this.current) : null;
      this.reset();
      return seg;
    }
    if (this.current.length >= this.softMaxFrames) {
      // Sehr lange ohne Pause: an der leisesten Stelle der letzten Sekunden teilen (Atemzug, Wortgrenze),
      // damit kein Wort zerschnitten wird. Der Rest beginnt den nächsten Abschnitt.
      const cut = this.current.length >= this.maxFrames ? this.current.length : this.quietestPoint();
      if (cut !== null) {
        const seg = concat(this.current.slice(0, cut));
        const restFrames = this.current.slice(cut);
        const restRms = this.currentRms.slice(cut);
        const threshold = Math.max(0.012, this.noise * 3);
        this.current = restFrames;
        this.currentRms = restRms;
        this.speechFrames = restRms.filter((r) => r > threshold).length;
        this.silenceRun = 0;
        return seg;
      }
    }
    return null;
  }
}

function rmsOf(f: Int16Array): number {
  let sum = 0;
  for (let k = 0; k < f.length; k++) sum += f[k] * f[k];
  return Math.sqrt(sum / f.length) / 32768;
}

export function concat(parts: Int16Array[]): Int16Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Int16Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Wandelt Audio mit anderer Abtastrate in 16 kHz um (lineare Interpolation). */
export function resampleTo16k(input: Int16Array, fromRate: number): Int16Array {
  if (fromRate === 16000) return input;
  const ratio = fromRate / 16000;
  const outLen = Math.floor(input.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = pos - i0;
    out[i] = Math.round(input[i0] * (1 - t) + input[i1] * t);
  }
  return out;
}
