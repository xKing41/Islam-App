/**
 * Spracherkennung auf dem Gerät mit whisper.cpp (über whisper.rn).
 *
 * whisper.rn wird erst geladen, wenn „Rezitation prüfen“ benutzt wird (nicht beim App-Start).
 * Die Bibliothek liefert TypeScript-Quellen mit, die unsere strengen Prüfungen nicht bestehen –
 * deshalb wird sie über require() mit eigenen, schlanken Typen eingebunden.
 */
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import { modelFile } from './model';
import { concat, Segmenter } from './segmenter';

type TranscribeResult = { result: string; isAborted: boolean };
type Job = { stop: () => Promise<void>; promise: Promise<TranscribeResult> };
type TranscribeOptions = { language?: string; maxThreads?: number; temperature?: number; beamSize?: number };

export type WhisperContext = {
  transcribe(path: string, options?: TranscribeOptions): Job;
  transcribeData(data: ArrayBuffer, options?: TranscribeOptions): Job;
  release(): Promise<void>;
};
type WhisperModule = { initWhisper(o: { filePath: string; useGpu?: boolean }): Promise<WhisperContext> };

let ctxPromise: Promise<WhisperContext> | null = null;

/** Lädt das Modell in den Speicher (nur einmal). */
export function getWhisper(): Promise<WhisperContext> {
  if (!ctxPromise) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- bewusst erst bei Bedarf laden (siehe oben)
    const { initWhisper } = require('whisper.rn/index') as WhisperModule;
    ctxPromise = initWhisper({ filePath: modelFile().uri, useGpu: false }).catch((e: unknown) => {
      ctxPromise = null;
      throw e;
    });
  }
  return ctxPromise;
}

export async function releaseWhisper() {
  const p = ctxPromise;
  ctxPromise = null;
  if (p) {
    try {
      await (await p).release();
    } catch {}
  }
}

const OPTIONS: TranscribeOptions = { language: 'ar', maxThreads: 4, temperature: 0 };

/**
 * Suchverfahren der Erkennung: „greedy“ (schnell) oder Strahlsuche mit 5 Kandidaten („beam“, gründlicher,
 * etwa dreimal so langsam). Welches als Haupt- und welches als Gegenprobe dient, ist an echten
 * Rezitationen gemessen (scripts/recite-eval).
 */
export type Decoder = 'greedy' | 'beam';

/** Erkennt 16-kHz-Mono-PCM (16 Bit) und gibt den arabischen Text (mit Vokalzeichen) zurück. */
export async function transcribePcm(pcm: Int16Array, decoder: Decoder = 'greedy'): Promise<string> {
  const ctx = await getWhisper();
  const bytes = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer;
  const r = await ctx.transcribeData(bytes, decoder === 'beam' ? { ...OPTIONS, beamSize: 5 } : OPTIONS).promise;
  return r.result ?? '';
}

/**
 * Selbsttest der ganzen Kette: mitgelieferte Aufnahme von Al-Fatiha, Vers 2 (Mishary Alafasy, EveryAyah)
 * → Pausen-Erkennung → Erkennung mit beiden Suchverfahren. Erwartet: „الحمد لله رب العالمين“.
 */
export async function selfTest(): Promise<{ greedy: string; beam: string; msGreedy: number; msBeam: number; segments: number }> {
  await getWhisper();
  const asset = Asset.fromModule(require('../../../assets/audio/selbsttest-001002.wav'));
  await asset.downloadAsync();
  const bytes = await new File(asset.localUri ?? asset.uri).bytes();
  const pcm = wavToPcm(bytes);
  // wie beim Mikrofon: in Stücken einspeisen, am Ende „Stopp“
  const seg = new Segmenter({ sampleRate: 16000 });
  const parts: Int16Array[] = [];
  for (let i = 0; i < pcm.length; i += 1600) parts.push(...seg.push(pcm.subarray(i, i + 1600)));
  parts.push(...seg.push(new Int16Array(16000)));
  const rest = seg.flush();
  if (rest) parts.push(rest);
  const audio = parts.length ? concat(parts) : pcm;
  let t0 = Date.now();
  const greedy = await transcribePcm(audio, 'greedy');
  const msGreedy = Date.now() - t0;
  t0 = Date.now();
  const beam = await transcribePcm(audio, 'beam');
  const msBeam = Date.now() - t0;
  return { greedy, beam, msGreedy, msBeam, segments: parts.length };
}

/** Liest 16-Bit-PCM aus einer WAV-Datei (sucht den data-Block). */
export function wavToPcm(bytes: Uint8Array): Int16Array {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 12;
  while (pos + 8 <= bytes.length) {
    const id = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
    const size = v.getUint32(pos + 4, true);
    if (id === 'data') {
      const n = Math.min(size, bytes.length - pos - 8) >> 1;
      const out = new Int16Array(n);
      for (let i = 0; i < n; i++) out[i] = v.getInt16(pos + 8 + 2 * i, true);
      return out;
    }
    pos += 8 + size + (size & 1);
  }
  throw new Error('WAV ohne data-Block');
}
