/**
 * Spracherkennung auf dem Gerät mit whisper.cpp (über whisper.rn).
 *
 * whisper.rn wird erst geladen, wenn „Rezitation prüfen“ benutzt wird (nicht beim App-Start).
 * Die Bibliothek liefert TypeScript-Quellen mit, die unsere strengen Prüfungen nicht bestehen –
 * deshalb wird sie über require() mit eigenen, schlanken Typen eingebunden.
 */
import { Asset } from 'expo-asset';

import { modelFile } from './model';

type TranscribeResult = { result: string; isAborted: boolean };
type Job = { stop: () => Promise<void>; promise: Promise<TranscribeResult> };
type TranscribeOptions = { language?: string; maxThreads?: number; temperature?: number };

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

/** Erkennt 16-kHz-Mono-PCM (16 Bit) und gibt den arabischen Text zurück. */
export async function transcribePcm(pcm: Int16Array): Promise<string> {
  const ctx = await getWhisper();
  const bytes = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer;
  const r = await ctx.transcribeData(bytes, OPTIONS).promise;
  return r.result ?? '';
}

/**
 * Selbsttest: erkennt eine mitgelieferte Aufnahme von Al-Fatiha, Vers 2 (Mishary Alafasy, EveryAyah).
 * Erwartet: „الحمد لله رب العالمين“.
 */
export async function selfTest(): Promise<{ text: string; ms: number }> {
  const ctx = await getWhisper();
  const asset = Asset.fromModule(require('../../../assets/audio/selbsttest-001002.wav'));
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const t0 = Date.now();
  const r = await ctx.transcribe(uri, OPTIONS).promise;
  return { text: r.result ?? '', ms: Date.now() - t0 };
}
