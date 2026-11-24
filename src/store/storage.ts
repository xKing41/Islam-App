import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Gemeinsamer Speicher für alle dauerhaft gespeicherten Zustände (lokal auf dem Gerät). */
export const appStorage = createJSONStorage(() => AsyncStorage);
