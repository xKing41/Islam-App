import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appStorage } from './storage';

type HadithState = {
  favorites: number[];
  toggleFavorite: (id: number) => void;
};

export const useHadithStore = create<HadithState>()(
  persist(
    (set) => ({
      favorites: [],
      toggleFavorite: (id) =>
        set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [id, ...s.favorites] })),
    }),
    { name: 'hadith', storage: appStorage, partialize: ({ favorites }) => ({ favorites }) }
  )
);
