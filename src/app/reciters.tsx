import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText, Card, Icon, ListGroup, ListRow, PlayButton, Radio, Screen, SectionTitle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useSamplePlayer } from '@/hooks/use-sample-player';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { getReciter, groupReciters, RECITERS, type Reciter, reciterSampleUrls } from '@/lib/quran/audio';
import { useSettings } from '@/store/settings';

/** Auswahl des Rezitators: Suche, Gruppen nach Vortragsart und Hörprobe (Sure 112). */
export default function RecitersScreen() {
  const t = useT();
  const theme = useTheme();
  const selected = useSettings((s) => s.reciter);
  const set = useSettings((s) => s.set);
  const [query, setQuery] = useState('');
  const sample = useSamplePlayer();
  const groups = groupReciters(query);
  const current = getReciter(selected);

  const subtitle = (r: Reciter) =>
    [t.reciters.styles[r.style], r.note ? t.reciters.notes[r.note] : null, t.reciters.quality(r.kbps)].filter(Boolean).join(' · ');

  return (
    <Screen>
      <Card tone="alt" style={{ gap: 2 }}>
        <AppText variant="small" color="textSecondary">
          {t.reciters.current}
        </AppText>
        <AppText variant="heading">{current.name}</AppText>
        <AppText variant="caption" color="textSecondary">
          {subtitle(current)}
        </AppText>
      </Card>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          backgroundColor: theme.card,
          borderRadius: Radius.md,
          paddingHorizontal: Spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        }}>
        <Icon name="magnify" color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t.reciters.search}
          placeholderTextColor={theme.textMuted}
          style={{ flex: 1, paddingVertical: 12, color: theme.text, fontSize: 16 }}
          autoCorrect={false}
          accessibilityLabel={t.reciters.search}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="clear">
            <Icon name="close-circle" color={theme.textMuted} size={20} />
          </Pressable>
        ) : null}
      </View>
      <AppText variant="caption" color="textSecondary">
        {t.reciters.sampleHint} {t.reciters.count(RECITERS.length)}.
      </AppText>

      {groups.length === 0 ? (
        <AppText color="textSecondary" style={{ textAlign: 'center' }}>
          {t.reciters.noMatch}
        </AppText>
      ) : null}

      {groups.map((g) => (
        <View key={g.style} style={{ gap: Spacing.md }}>
          <View style={{ gap: 2 }}>
            <SectionTitle>{t.reciters.styles[g.style]}</SectionTitle>
            <AppText variant="caption" color="textSecondary" style={{ marginTop: Spacing.sm }}>
              {t.reciters.styleHints[g.style]}
            </AppText>
          </View>
          <ListGroup>
            {g.items.map((r, i) => {
              const playing = sample.current === r.id;
              const isSelected = r.id === selected;
              return (
                <ListRow
                  key={r.id}
                  title={r.name}
                  subtitle={[r.note ? t.reciters.notes[r.note] : null, t.reciters.quality(r.kbps)].filter(Boolean).join(' · ')}
                  last={i === g.items.length - 1}
                  onPress={() => set({ reciter: r.id })}
                  accessibilityLabel={`${r.name}, ${t.reciters.styles[r.style]}`}
                  right={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                      <PlayButton
                        playing={playing}
                        loading={sample.loading}
                        onPress={() => sample.toggle(r.id, reciterSampleUrls(r.id))}
                        label={`${playing ? t.reciters.stop : t.reciters.play}: ${r.name}`}
                      />
                      <Radio selected={isSelected} />
                    </View>
                  }
                />
              );
            })}
          </ListGroup>
        </View>
      ))}
    </Screen>
  );
}
