/**
 * Koran-Wiedergabe Vers für Vers (expo-audio Playlist – der nächste Vers wird vorgeladen).
 */
import { type AudioPlaylist, createAudioPlaylist, setAudioModeAsync } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { buildTracks, getReciter, type Track } from './audio';

export type PlayerState = {
  active: boolean;
  playing: boolean;
  buffering: boolean;
  /** Aktuell gespielter Vers (null während der Basmala oder wenn inaktiv). */
  currentAya: number | null;
  repeat: boolean;
  error: boolean;
};

const initial: PlayerState = { active: false, playing: false, buffering: false, currentAya: null, repeat: false, error: false };

let audioModeSet = false;

export function useQuranPlayer(sura: number, ayas: number, reciterId: string, title: (aya: number) => string) {
  const playlistRef = useRef<AudioPlaylist | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const subsRef = useRef<{ remove: () => void }[]>([]);
  const [state, setState] = useState<PlayerState>(initial);
  const titleRef = useRef(title);
  titleRef.current = title;

  const teardown = useCallback(() => {
    subsRef.current.forEach((s) => s.remove());
    subsRef.current = [];
    const pl = playlistRef.current;
    playlistRef.current = null;
    if (pl) {
      try {
        pl.pause();
        pl.clearLockScreenControls();
      } catch {}
      try {
        pl.destroy();
      } catch {}
    }
  }, []);

  useEffect(() => teardown, [teardown]);

  // Beim Wechsel von Sure oder Rezitator: Wiedergabe beenden.
  useEffect(() => {
    teardown();
    setState(initial);
  }, [sura, reciterId, teardown]);

  const playFrom = useCallback(
    async (aya: number) => {
      teardown();
      if (!audioModeSet) {
        audioModeSet = true;
        setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
      }
      const tracks = buildTracks(reciterId, sura, aya, ayas);
      tracksRef.current = tracks;
      const pl = createAudioPlaylist({ sources: tracks.map((t) => t.url), updateInterval: 400 });
      playlistRef.current = pl;
      setState((s) => ({ ...initial, repeat: s.repeat, active: true, buffering: true, currentAya: tracks[0].isBasmala ? null : tracks[0].aya }));
      pl.loop = state.repeat ? 'single' : 'none';

      const reciter = getReciter(reciterId);
      const update = (index: number) => {
        const tr = tracksRef.current[index];
        if (!tr) return;
        try {
          pl.updateLockScreenMetadata({ title: titleRef.current(tr.aya), artist: reciter.name });
        } catch {}
      };

      subsRef.current.push(
        pl.addListener('playlistStatusUpdate', (st) => {
          const tr = tracksRef.current[st.currentIndex];
          const finishedAll = st.didJustFinish && st.currentIndex >= tracksRef.current.length - 1 && pl.loop === 'none';
          setState((s) => ({
            ...s,
            active: !finishedAll,
            playing: finishedAll ? false : st.playing,
            buffering: st.isBuffering,
            currentAya: finishedAll ? null : tr && !tr.isBasmala ? tr.aya : null,
          }));
        }),
        pl.addListener('trackChanged', ({ currentIndex }) => update(currentIndex))
      );

      try {
        pl.setActiveForLockScreen(true, { title: titleRef.current(aya), artist: reciter.name });
      } catch {}
      pl.play();
    },
    [ayas, reciterId, sura, teardown, state.repeat]
  );

  const toggle = useCallback(() => {
    const pl = playlistRef.current;
    if (!pl) return;
    if (pl.playing) pl.pause();
    else pl.play();
  }, []);

  const stop = useCallback(() => {
    teardown();
    setState((s) => ({ ...initial, repeat: s.repeat }));
  }, [teardown]);

  const next = useCallback(() => playlistRef.current?.next(), []);
  const previous = useCallback(() => playlistRef.current?.previous(), []);

  const setRepeat = useCallback((on: boolean) => {
    if (playlistRef.current) playlistRef.current.loop = on ? 'single' : 'none';
    setState((s) => ({ ...s, repeat: on }));
  }, []);

  return { state, playFrom, toggle, stop, next, previous, setRepeat };
}
