import { Text, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * Zeigt die Umschrift eines Verses.
 * - Türkisch: Tanzil „Çeviriyazı“ (Muhammet Abay) – reiner Text.
 * - Deutsch: Tanzil „Transliteration“ mit Markierungen: <u>…</u> = lang/emphatisch (unterstrichen),
 *   <b>…</b> = nicht gesprochen (blass).
 */
export function Transliteration({ text, lang, style }: { text: string; lang: 'de' | 'tr'; style?: TextStyle }) {
  const theme = useTheme();
  const base: TextStyle = {
    color: theme.textSecondary,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
    ...style,
  };
  if (lang === 'tr') return <Text style={base}>{text}</Text>;

  // Markierungen: <u> lang/emphatisch, <b>/<strong> stumm, <i> Buchstabenkombination (z. B. th).
  // Schließende Tags kommen teils in Großbuchstaben vor (</U>).
  const parts: { t: string; u: boolean; b: boolean }[] = [];
  let u = 0;
  let b = 0;
  for (const token of text.split(/(<\/?[a-zA-Z]+>)/)) {
    const tag = token.match(/^<(\/?)([a-zA-Z]+)>$/);
    if (tag) {
      const name = tag[2].toLowerCase();
      const delta = tag[1] ? -1 : 1;
      if (name === 'u') u = Math.max(0, u + delta);
      else if (name === 'b' || name === 'strong') b = Math.max(0, b + delta);
      continue; // <i> und Unbekanntes: nur entfernen
    }
    if (token) parts.push({ t: token, u: u > 0, b: b > 0 });
  }

  return (
    <Text style={base}>
      {parts.map((p, i) => (
        <Text key={i} style={[p.u && { textDecorationLine: 'underline' }, p.b && { color: theme.textMuted, opacity: 0.6 }]}>
          {p.t}
        </Text>
      ))}
    </Text>
  );
}
