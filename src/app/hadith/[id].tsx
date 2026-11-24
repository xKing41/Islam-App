import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Pressable, Share, View } from 'react-native';

import { AppText, Card, Icon, Screen, SectionTitle } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { getHadith } from '@/lib/hadith/data';
import { useHadithStore } from '@/store/hadith';
import { useSettings } from '@/store/settings';

export default function HadithDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const theme = useTheme();
  const lang = useSettings((s) => s.language);
  const favorites = useHadithStore((s) => s.favorites);
  const toggleFavorite = useHadithStore((s) => s.toggleFavorite);
  const hid = Number(id);
  // Falls der Hadith in der eingestellten Sprache fehlt: andere Sprache zeigen.
  const found = getHadith(lang, hid) ?? getHadith(lang === 'de' ? 'tr' : 'de', hid);
  const fav = favorites.includes(hid);

  if (!found) {
    return (
      <Screen>
        <AppText>{t.hadith.noResults}</AppText>
      </Screen>
    );
  }
  const { item, body } = found;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: t.hadith.title,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
              <Pressable
                onPress={() =>
                  Share.share({ message: `${body.text}\n\n${body.attribution} · ${body.grade}\n— HadeethEnc.com (#${hid})` }).catch(() => {})
                }
                hitSlop={10}
                accessibilityLabel={t.reader.share}>
                <Icon name="share-variant-outline" color={theme.primary} />
              </Pressable>
              <Pressable onPress={() => toggleFavorite(hid)} hitSlop={10} accessibilityLabel={t.hadith.favorites}>
                <Icon name={fav ? 'star' : 'star-outline'} color={theme.accent} />
              </Pressable>
            </View>
          ),
        }}
      />

      <AppText variant="heading">{item.title}</AppText>

      <Card style={{ gap: Spacing.md }}>
        <AppText style={{ fontSize: 17, lineHeight: 26 }}>{body.text}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {body.grade ? <Badge icon="check-decagram" label={`${t.hadith.grade}: ${body.grade}`} /> : null}
          {body.attribution ? <Badge icon="book-outline" label={body.attribution} /> : null}
        </View>
      </Card>

      {body.ar ? (
        <>
          <SectionTitle>{t.hadith.arabic}</SectionTitle>
          <Card>
            <AppText style={{ fontFamily: Fonts.arabic, fontSize: 22, lineHeight: 42, textAlign: 'right', writingDirection: 'rtl' }}>{body.ar}</AppText>
            {body.gradeAr ? (
              <AppText variant="caption" color="textSecondary" style={{ textAlign: 'right', marginTop: Spacing.sm, fontFamily: Fonts.arabic }}>
                {body.gradeAr}
              </AppText>
            ) : null}
          </Card>
        </>
      ) : null}

      {body.explanation ? (
        <>
          <SectionTitle>{t.hadith.explanation}</SectionTitle>
          <AppText style={{ lineHeight: 24 }}>{body.explanation}</AppText>
        </>
      ) : null}

      {body.hints.length ? (
        <>
          <SectionTitle>{t.hadith.lessons}</SectionTitle>
          <View style={{ gap: Spacing.sm }}>
            {body.hints.map((h, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <AppText color="primary" variant="label">
                  {i + 1}.
                </AppText>
                <AppText style={{ flex: 1, lineHeight: 23 }}>{h}</AppText>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <AppText variant="caption" color="textMuted">
        {t.hadith.sourceNote} · #{hid}
      </AppText>
    </Screen>
  );
}

function Badge({ icon, label }: { icon: Parameters<typeof Icon>[0]['name']; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.primarySoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, maxWidth: '100%' }}>
      <Icon name={icon} size={16} color={theme.primary} />
      <AppText variant="caption" color="primary" style={{ fontWeight: '600', flexShrink: 1 }}>
        {label}
      </AppText>
    </View>
  );
}
