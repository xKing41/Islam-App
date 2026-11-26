/**
 * Erkennt echte Rezitationen genau wie die App: Audio → 16 kHz mono → Pausen-Erkennung (Segmenter der App)
 * → whisper.cpp (dasselbe wie in whisper.rn) → Text je Abschnitt. Ergebnis wird zwischengespeichert,
 * damit der Wortabgleich ohne erneute Erkennung beliebig oft ausgewertet werden kann (score.ts).
 *
 *   npx tsx scripts/recite-eval/transcribe.ts --rtool ./rtool --model ggml-quran-base-q8_0.bin --work eval-work \
 *     [--reciters Husary_128kbps,Alafasy_128kbps] [--variants greedy,beam5] [--threads 4] [--shard 0/2]
 *     [--surahs <url-vorlage> --list reciter:sura,…] [--jobs auftraege.json]
 *
 * Quellen: EveryAyah (Vers für Vers) bzw. mit --surahs ganze Suren (z. B. mp3quran.net), jeweils für
 * die Verse aus pairs.json und einige kurze Suren.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { Segmenter, splitPoint } from '../../src/lib/recite/segmenter';

type Args = Record<string, string>;
const args: Args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];

const ROOT = resolve(__dirname, '../..');
const WORK = resolve(args.work ?? 'eval-work');
const RTOOL = resolve(args.rtool ?? 'rtool');
const MODEL = resolve(args.model ?? 'ggml-quran-base-q8_0.bin');
const RECITERS = (args.reciters ?? 'Husary_128kbps,Alafasy_128kbps,Minshawy_Murattal_128kbps').split(',');
const VARIANTS = (args.variants ?? 'greedy,beam5').split(',');
const THREADS = Number(args.threads ?? 2);

export type Transcripts = Record<string, { segments: { ms: number; text: Record<string, string> }[] }>;

const pad3 = (n: number) => String(n).padStart(3, '0');

/** Verse aus pairs.json plus die Kontrollsuren (Al-Fatiha, kurze Suren, Ayat al-Kursi). */
export function evalVerses(): [number, number][] {
  const pairs: { a: [number, number]; b: [number, number] }[] = JSON.parse(
    readFileSync(join(ROOT, 'scripts/recite-eval/pairs.json'), 'utf8'),
  );
  const set = new Map<string, [number, number]>();
  for (const p of pairs) for (const v of [p.a, p.b]) set.set(`${v[0]}:${v[1]}`, v);
  const meta = JSON.parse(readFileSync(join(ROOT, 'src/data/quran/meta.json'), 'utf8'));
  for (const s of [1, 112, 113, 114, 103, 108, 110]) {
    for (let a = 1; a <= meta.suras[s - 1].ayas; a++) set.set(`${s}:${a}`, [s, a]);
  }
  set.set('2:255', [2, 255]);
  return [...set.values()].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}

function readWav(path: string): Int16Array {
  const buf = readFileSync(path);
  let pos = 12;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === 'data') {
      const n = Math.min(size, buf.length - pos - 8) >> 1;
      const out = new Int16Array(n);
      for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(pos + 8 + 2 * i);
      return out;
    }
    pos += 8 + size + (size & 1);
  }
  throw new Error(`kein data-Block: ${path}`);
}

function writeWav(path: string, pcm: Int16Array) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length * 2, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(16000, 24);
  h.writeUInt32LE(32000, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length * 2, 40);
  writeFileSync(path, Buffer.concat([h, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)]));
}

/** Zerlegt eine Aufnahme wie die App (Puffer von 100 ms, am Ende „Stopp“). */
export function segmentLikeApp(pcm: Int16Array): Int16Array[] {
  // Abweichende Einstellungen nur zum Ausprobieren (Standard = wie in der App)
  const seg = new Segmenter({
    sampleRate: 16000,
    ...(args.silenceMs ? { silenceMs: Number(args.silenceMs) } : {}),
    ...(args.softMaxMs ? { softMaxSegmentMs: Number(args.softMaxMs) } : {}),
    ...(args.maxMs ? { maxSegmentMs: Number(args.maxMs) } : {}),
  });
  const out: Int16Array[] = [];
  for (let i = 0; i < pcm.length; i += 1600) out.push(...seg.push(pcm.subarray(i, i + 1600)));
  // 1 s Stille anhängen, wie wenn man nach dem letzten Vers kurz wartet und dann stoppt
  out.push(...seg.push(new Int16Array(16000)));
  const rest = seg.flush();
  if (rest) out.push(rest);
  return out;
}

async function download(url: string, dest: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = spawnSync('curl', ['-sfL', '--max-time', '120', '-A', 'IslamApp-Eval/1.0', '-o', dest, url]);
    if (r.status === 0 && existsSync(dest)) return;
    await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
  }
  throw new Error(`Download fehlgeschlagen: ${url}`);
}

function toWav16k(src: string, dest: string) {
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', '-map_metadata', '-1', '-fflags', '+bitexact', dest]);
  if (r.status !== 0) throw new Error(`ffmpeg: ${src}: ${r.stderr}`);
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let k = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (k < items.length) await fn(items[k++]);
    }),
  );
}

/** Lässt rtool alle Dateien einer Liste erkennen und meldet jedes Ergebnis sofort. */
function runRtool(files: string[], variant: string, onResult: (file: string, text: string) => void): Promise<void> {
  const extra = variant === 'greedy' ? [] : variant.startsWith('beam') ? ['--beam', variant.slice(4)] : [];
  return new Promise((res, rej) => {
    const p = spawn(RTOOL, [MODEL, '--threads', String(THREADS), ...extra]);
    let buf = '';
    let done = 0;
    p.stdout.setEncoding('utf8'); // setzt mehrbytige Zeichen über Paketgrenzen korrekt zusammen
    p.stdout.on('data', (d: string) => {
      buf += d;
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        const j = JSON.parse(line);
        onResult(j.file, j.text ?? '');
        if (++done % 100 === 0) console.log(`  ${variant}: ${done}/${files.length}`);
      }
    });
    p.stderr.on('data', (d: Buffer) => process.stderr.write(d));
    p.on('error', rej);
    p.on('close', () => res());
    p.stdin.write(files.join('\n') + '\n');
    p.stdin.end();
  });
}

async function main() {
  mkdirSync(join(WORK, 'audio'), { recursive: true });
  mkdirSync(join(WORK, 'seg'), { recursive: true });
  const cacheFile = join(WORK, 'transcripts.json');
  const cache: Transcripts = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};

  // 1) Aufnahmen holen und zerlegen
  type Job = { key: string; url: string };
  const jobs: Job[] = [];
  if (args.jobs) {
    // fertige Auftragsliste [{ key, url }], z. B. aus mp3quran-jobs.mjs (ganze Suren)
    jobs.push(...(JSON.parse(readFileSync(resolve(args.jobs), 'utf8')) as Job[]));
  } else if (args.surahs) {
    // ganze Suren: --surahs "https://server.example/{reciter}/{sss}.mp3" mit --list "reciter:sura,…"
    for (const item of (args.list ?? '').split(',').filter(Boolean)) {
      const [rec, s] = item.split(':');
      jobs.push({ key: `${rec}/sura${pad3(Number(s))}`, url: args.surahs.replace('{reciter}', rec).replace('{sss}', pad3(Number(s))) });
    }
  } else {
    for (const rec of RECITERS) {
      for (const [s, a] of evalVerses()) {
        jobs.push({ key: `${rec}/${pad3(s)}${pad3(a)}`, url: `https://everyayah.com/data/${rec}/${pad3(s)}${pad3(a)}.mp3` });
      }
    }
  }
  if (args.limit) jobs.length = Math.min(jobs.length, Number(args.limit));
  if (args.shard) {
    // --shard k/n: nur jeden n-ten Auftrag (für parallele Läufe in GitHub Actions)
    const [k, n] = args.shard.split('/').map(Number);
    const mine = jobs.filter((_, i) => i % n === k);
    jobs.length = 0;
    jobs.push(...mine);
  }
  const segFiles = new Map<string, string[]>();
  let n = 0;
  await pool(jobs, 4, async (job) => {
    const safe = job.key.replace(/[^\w.-]/g, '_');
    const segDir = join(WORK, 'seg', safe);
    const listFile = join(segDir, 'list.json');
    if (existsSync(listFile)) {
      segFiles.set(job.key, JSON.parse(readFileSync(listFile, 'utf8')));
      return;
    }
    const mp3 = join(WORK, 'audio', `${safe}.mp3`);
    const wav = join(WORK, 'audio', `${safe}.wav`);
    if (!existsSync(wav)) {
      await download(job.url, mp3);
      toWav16k(mp3, wav);
    }
    const parts = segmentLikeApp(readWav(wav));
    mkdirSync(segDir, { recursive: true });
    const files = parts.map((p, k) => {
      const f = join(segDir, `${k}.wav`);
      writeWav(f, p);
      return f;
    });
    writeFileSync(listFile, JSON.stringify(files));
    segFiles.set(job.key, files);
    if (++n % 100 === 0) console.log(`Audio: ${n}/${jobs.length}`);
  });

  // 2) Erkennen (nur was noch fehlt), Varianten parallel; der Zwischenstand wird laufend gespeichert
  const where = new Map<string, { key: string; k: number; n: number }>();
  for (const job of jobs) {
    const files = segFiles.get(job.key) ?? [];
    files.forEach((f, k) => where.set(f, { key: job.key, k, n: files.length }));
  }
  let dirty = 0;
  const save = () => {
    writeFileSync(cacheFile, JSON.stringify(cache));
    dirty = 0;
  };
  const ensure = (f: string, w: { key: string; n: number }) => {
    const entry = (cache[w.key] ??= { segments: [] });
    for (let k = 0; k < w.n; k++) {
      entry.segments[k] ??= { ms: Math.round(((statSync(join(dirname(f), `${k}.wav`)).size - 44) / 32000) * 1000), text: {} };
    }
    return entry;
  };
  await Promise.all(
    VARIANTS.map(async (variant) => {
      const split = variant.endsWith('-split');
      const merge = variant.endsWith('-merge');
      const base = split ? variant.slice(0, -6) : merge ? variant.slice(0, -6) : variant;
      const todo: string[] = [];
      const halves = new Map<string, { f: string; part: 0 | 1 }>();
      const merged = new Map<string, string>();
      for (const [f, w] of where) {
        if (cache[w.key]?.segments[w.k]?.text[variant] !== undefined) continue;
        if (merge) {
          // Zusammenhören: Abschnitt k mit k+1 gemeinsam (höchstens 25 s), sonst leer
          const next = join(dirname(f), `${w.k + 1}.wav`);
          const pcmA = readWav(f);
          const pcmB = w.k + 1 < w.n && existsSync(next) ? readWav(next) : null;
          if (!pcmB || pcmA.length + pcmB.length > 25 * 16000) {
            ensure(f, w).segments[w.k].text[variant] = '';
            continue;
          }
          const both = new Int16Array(pcmA.length + pcmB.length);
          both.set(pcmA, 0);
          both.set(pcmB, pcmA.length);
          const mf = f.replace(/\.wav$/, '-m.wav');
          writeWav(mf, both);
          merged.set(mf, f);
          todo.push(mf);
          continue;
        }
        if (!split) {
          todo.push(f);
          continue;
        }
        // Nachhören: Abschnitt an einer Atempause in der Mitte teilen, beide Hälften einzeln erkennen
        const pcm = readWav(f);
        const at = splitPoint(pcm);
        const a = f.replace(/\.wav$/, '-a.wav');
        const b = f.replace(/\.wav$/, '-b.wav');
        writeWav(a, pcm.subarray(0, at));
        writeWav(b, pcm.subarray(at));
        halves.set(a, { f, part: 0 });
        halves.set(b, { f, part: 1 });
        todo.push(a, b);
      }
      if (!todo.length) return;
      console.log(`${variant}: ${todo.length} Dateien`);
      const parts = new Map<string, [string?, string?]>();
      await runRtool(todo, base, (file, text) => {
        if (merge) {
          const f = merged.get(file);
          if (!f) return;
          const w = where.get(f)!;
          ensure(f, w).segments[w.k].text[variant] = text;
        } else if (!split) {
          const w = where.get(file);
          if (!w) return;
          ensure(file, w).segments[w.k].text[variant] = text;
        } else {
          const h = halves.get(file);
          if (!h) return;
          const p = parts.get(h.f) ?? [];
          p[h.part] = text;
          parts.set(h.f, p);
          if (p[0] === undefined || p[1] === undefined) return;
          const w = where.get(h.f)!;
          ensure(h.f, w).segments[w.k].text[variant] = `${p[0]} ${p[1]}`;
        }
        if (++dirty >= 50) save();
      });
    }),
  );
  save();
  console.log(`fertig: ${Object.keys(cache).length} Aufnahmen in ${cacheFile}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
