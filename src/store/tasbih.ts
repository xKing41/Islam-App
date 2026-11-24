import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appStorage } from './storage';

type TasbihState = {
  dhikrId: string;
  count: number;
  target: number; // 0 = frei
  rounds: number;
  total: number;
  afterPrayerMode: boolean;
  afterPrayerStep: number; // 0..2
  vibration: boolean;
  increment: () => { reachedTarget: boolean };
  reset: () => void;
  select: (dhikrId: string) => void;
  setTarget: (target: number) => void;
  setAfterPrayerMode: (on: boolean) => void;
  setVibration: (on: boolean) => void;
};

/** Reihenfolge der Tesbihat nach dem Gebet. */
export const AFTER_PRAYER_SEQUENCE = [
  { dhikrId: 'subhanallah', target: 33 },
  { dhikrId: 'alhamdulillah', target: 33 },
  { dhikrId: 'allahuakbar', target: 34 },
] as const;

export const useTasbih = create<TasbihState>()(
  persist(
    (set, get) => ({
      dhikrId: 'subhanallah',
      count: 0,
      target: 33,
      rounds: 0,
      total: 0,
      afterPrayerMode: false,
      afterPrayerStep: 0,
      vibration: true,
      increment: () => {
        const s = get();
        const count = s.count + 1;
        const reached = s.target > 0 && count >= s.target;
        if (!reached) {
          set({ count, total: s.total + 1 });
          return { reachedTarget: false };
        }
        if (s.afterPrayerMode) {
          const next = (s.afterPrayerStep + 1) % AFTER_PRAYER_SEQUENCE.length;
          const step = AFTER_PRAYER_SEQUENCE[next];
          set({
            count: 0,
            total: s.total + 1,
            afterPrayerStep: next,
            dhikrId: step.dhikrId,
            target: step.target,
            rounds: next === 0 ? s.rounds + 1 : s.rounds,
          });
        } else {
          set({ count: 0, total: s.total + 1, rounds: s.rounds + 1 });
        }
        return { reachedTarget: true };
      },
      reset: () => {
        const s = get();
        if (s.afterPrayerMode) {
          const step = AFTER_PRAYER_SEQUENCE[0];
          set({ count: 0, rounds: 0, afterPrayerStep: 0, dhikrId: step.dhikrId, target: step.target });
        } else {
          set({ count: 0, rounds: 0 });
        }
      },
      select: (dhikrId) => set({ dhikrId, count: 0, rounds: 0, afterPrayerMode: false }),
      setTarget: (target) => set({ target, count: 0, rounds: 0 }),
      setAfterPrayerMode: (on) => {
        if (on) {
          const step = AFTER_PRAYER_SEQUENCE[0];
          set({ afterPrayerMode: true, afterPrayerStep: 0, dhikrId: step.dhikrId, target: step.target, count: 0, rounds: 0 });
        } else {
          set({ afterPrayerMode: false, count: 0, rounds: 0 });
        }
      },
      setVibration: (vibration) => set({ vibration }),
    }),
    {
      name: 'tasbih',
      storage: appStorage,
      partialize: ({ dhikrId, count, target, rounds, total, afterPrayerMode, afterPrayerStep, vibration }) => ({
        dhikrId, count, target, rounds, total, afterPrayerMode, afterPrayerStep, vibration,
      }),
    }
  )
);
