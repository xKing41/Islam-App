import { de, type Dictionary } from './de';
import { tr } from './tr';
import { useSettings } from '@/store/settings';

export type Language = 'de' | 'tr';

const dictionaries: Record<Language, Dictionary> = { de, tr };

export function getDictionary(lang: Language): Dictionary {
  return dictionaries[lang] ?? de;
}

/** Liefert die Texte in der eingestellten Sprache: `const t = useT(); t.home.nextPrayer`. */
export function useT(): Dictionary {
  const lang = useSettings((s) => s.language);
  return getDictionary(lang);
}

export type { Dictionary };
