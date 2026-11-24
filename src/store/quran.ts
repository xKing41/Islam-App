import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appStorage } from './storage';

export type Bookmark = { sura: number; aya: number; createdAt: number };

type QuranState = {
  bookmarks: Bookmark[];
  lastRead: { sura: number; aya: number } | null;
  toggleBookmark: (sura: number, aya: number) => void;
  isBookmarked: (sura: number, aya: number) => boolean;
  setLastRead: (sura: number, aya: number) => void;
};

export const useQuranStore = create<QuranState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      lastRead: null,
      toggleBookmark: (sura, aya) =>
        set((s) => {
          const exists = s.bookmarks.some((b) => b.sura === sura && b.aya === aya);
          return {
            bookmarks: exists
              ? s.bookmarks.filter((b) => !(b.sura === sura && b.aya === aya))
              : [{ sura, aya, createdAt: Date.now() }, ...s.bookmarks],
          };
        }),
      isBookmarked: (sura, aya) => get().bookmarks.some((b) => b.sura === sura && b.aya === aya),
      setLastRead: (sura, aya) => set({ lastRead: { sura, aya } }),
    }),
    {
      name: 'quran',
      storage: appStorage,
      partialize: ({ bookmarks, lastRead }) => ({ bookmarks, lastRead }),
    }
  )
);
