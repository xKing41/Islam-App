/**
 * Hörproben (Rezitatoren, Azan-Stimmen): immer nur eine gleichzeitig, Stopp beim Verlassen der Seite.
 *
 * Quellen sind Internet-Adressen oder Namen von Tönen, die in der App liegen (Android „res/raw“,
 * z. B. „azan_a“ ohne Endung) – expo-audio spielt beide ab.
 */
import { type AudioPlaylist, createAudioPlaylist, setAudioModeAsync } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useSamplePlayer() {
  const ref = useRef<AudioPlaylist | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stop = useCallback(() => {
    const pl = ref.current;
    ref.current = null;
    if (pl) {
      try {
        pl.pause();
        pl.destroy();
      } catch {}
    }
    setCurrent(null);
    setLoading(false);
  }, []);

  useEffect(() => stop, [stop]);
  // Seite verlassen (anderer Bildschirm darüber) → Hörprobe anhalten
  useFocusEffect(useCallback(() => stop, [stop]));

  const toggle = useCallback(
    (key: string, sources: string[]) => {
      if (ref.current && current === key) {
        stop();
        return;
      }
      stop();
      setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'doNotMix' }).catch(() => {});
      const pl = createAudioPlaylist({ sources });
      let started = false;
      pl.addListener('playlistStatusUpdate', (st) => {
        if (ref.current !== pl) return;
        setLoading(!st.playing || st.isBuffering);
        if (st.playing && !started) {
          started = true;
          // Im Protokoll sichtbar (Start-Test im Emulator prüft, dass Hörproben wirklich abspielen)
          console.log(`[Hörprobe] ${key}: spielt (${Math.round(st.duration)} s)`);
        }
        if (st.didJustFinish && st.currentIndex >= sources.length - 1) stop();
      });
      ref.current = pl;
      setCurrent(key);
      setLoading(true);
      pl.play();
    },
    [current, stop],
  );

  return { current, loading, toggle, stop };
}
