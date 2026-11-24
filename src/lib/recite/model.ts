/**
 * Erkennungsmodell für „Rezitation prüfen“.
 *
 * Grundlage: tarteel-ai/whisper-tiny-ar-quran (Tarteel AI, Apache-2.0) – ein auf Koran-Rezitationen
 * trainiertes Whisper-Modell. Umgewandelt für whisper.cpp und verkleinert über den GitHub-Workflow
 * `.github/workflows/model.yml`; dort wird auch die Genauigkeit an echten Rezitationen gemessen.
 * Das Modell wird einmalig heruntergeladen und läuft danach offline auf dem Gerät.
 */
import { Directory, File, Paths } from 'expo-file-system';

export type ModelInfo = { id: string; url: string; file: string; sizeMB: number; sha256: string };

export const MODEL: ModelInfo = {
  id: 'quran-tiny-q5_1',
  url: 'https://github.com/xKing41/Islam-App/releases/download/modell-quran-v1/ggml-quran-tiny-q5_1.bin',
  file: 'ggml-quran-tiny-q5_1.bin',
  sizeMB: 32,
  sha256: 'af8dfdd73c60b32e4e6d72e98e095e33fbeb04b9d39508580d051aa28202c646',
};

function modelDir(): Directory {
  return new Directory(Paths.document, 'models');
}

export function modelFile(m: ModelInfo = MODEL): File {
  return new File(modelDir(), m.file);
}

export function isModelReady(m: ModelInfo = MODEL): boolean {
  try {
    const f = modelFile(m);
    return f.exists && (f.size ?? 0) > m.sizeMB * 0.8 * 1e6;
  } catch {
    return false;
  }
}

/** Lädt das Modell herunter, prüft die SHA-256-Prüfsumme und legt es ab. */
export async function downloadModel(onProgress: (fraction: number) => void, m: ModelInfo = MODEL): Promise<void> {
  const dir = modelDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const part = new File(dir, `${m.file}.part`);
  if (part.exists) part.delete();
  const downloaded = await File.downloadFileAsync(m.url, part, {
    idempotent: true,
    onProgress: ({ bytesWritten, totalBytes }) => onProgress(totalBytes > 0 ? bytesWritten / totalBytes : 0),
  });
  const hash = (await downloaded.digest('SHA-256')).toLowerCase();
  if (hash !== m.sha256) {
    downloaded.delete();
    throw new Error(`Prüfsumme stimmt nicht (${hash.slice(0, 12)}…)`);
  }
  const target = modelFile(m);
  if (target.exists) target.delete();
  await downloaded.move(target);
}

export function deleteModel(m: ModelInfo = MODEL) {
  const f = modelFile(m);
  if (f.exists) f.delete();
}
