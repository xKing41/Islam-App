import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo } from 'react';
import { Linking, Pressable, Share, StyleSheet, View } from 'react-native';

import { GradePill, HadithListRow } from '@/components/hadith-list-row';
import { AppText, Card, Icon, Screen, SectionTitle } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryPath, contextList, getHadith, primaryCategory, relatedHadiths } from '@/lib/hadith/data';
import { collectionMeta, ROOT_TOPICS } from '@/lib/hadith/meta';
import type { CollectionKey } from '@/lib/hadith/types';
import { useHadithStore } from '@/store/hadith';
import { useSettings } from '@/store/settings';

export default function HadithDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const t = useT();
  const theme = useTheme();
  const settingsLang = useSettings((s) => s.language);
  const favorites = useHadithStore((s) => s.favorites);
  const toggleFavorite = useHadithStore((s) => s.toggleFavorite);
  const hid = Number(id);
  // Falls der Hadith in der eingestellten Sprache fehlt: andere Sprache zeigen.
  const own = getHadith(settingsLang, hid);
  const lang = own ? settingsLang : settingsLang === 'de' ? 'tr' : 'de';
  const found = own ?? getHadith(lang, hid);
  const fav = favorites.includes(hid);

  const extra = useMemo(() => {
    if (!found) return null;
    const cat = primaryCategory(lang, found.item);
    const path = cat ? categoryPath(lang, cat.id) : [];
    const list = contextList(lang, from, found.item, favorites);
    const pos = list.findIndex((h) => h.id === hid);
    return {
      path,
      related: relatedHadiths(lang, found.item, 5),
      prev: pos > 0 ? list[pos - 1] : null,
      next: pos >= 0 && pos < list.length - 1 ? list[pos + 1] : null,
      pos,
      total: list.length,
    };
  }, [found, lang, from, favorites, hid]);

  if (!found || !extra) {
    return (
      <Screen>
        <AppText>{t.hadith.noResults}</AppText>
      </Screen>
    );
  }
  const { item, body } = found;
  const open = (target: number) => router.replace({ pathname: '/hadith/[id]', params: from ? { id: target, from } : { id: target } });

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

      {/* Thema (Pfad) */}
      {extra.path.length ? (
        <View style={styles.crumbs}>
          {extra.path.map((c, i) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
              {i > 0 ? <Icon name="chevron-right" size={14} color={theme.textMuted} /> : null}
              <Pressable onPress={() => router.push({ pathname: '/hadith/category/[id]', params: { id: c.id } })} hitSlop={6} style={{ flexShrink: 1 }}>
                <AppText variant="caption" color="primary" style={{ fontWeight: '600' }} numberOfLines={1}>
                  {c.parent === null && ROOT_TOPICS[c.id] ? ROOT_TOPICS[c.id].name[lang] : c.title}
                </AppText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {/* Einstufung und Sammlungen */}
      <View style={styles.badges}>
        <GradePill g={item.g} large />
        {item.mt ? <SourceBadge label={collectionMeta('mt').short[lang]} strong /> : null}
        {item.s
          .filter((k) => !(item.mt && (k === 'bu' || k === 'mu')))
          .map((k: CollectionKey) => (
            <SourceBadge key={k} label={collectionMeta(k).short[lang]} />
          ))}
      </View>

      <Card style={{ gap: Spacing.md }}>
        <AppText style={{ fontSize: 17, lineHeight: 27 }} selectable>
          {body.text}
        </AppText>
      </Card>

      {body.ar ? (
        <>
          <SectionTitle>{t.hadith.arabic}</SectionTitle>
          <Card>
            <AppText style={{ fontFamily: Fonts.arabic, fontSize: 22, lineHeight: 42, textAlign: 'right', writingDirection: 'rtl' }} selectable>
              {body.ar}
            </AppText>
          </Card>
        </>
      ) : null}

      {body.explanation ? (
        <>
          <SectionTitle>{t.hadith.explanation}</SectionTitle>
          <AppText style={{ lineHeight: 24 }} selectable>
            {body.explanation}
          </AppText>
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

      {/* Quelle und Einstufung im Wortlaut */}
      <SectionTitle>{t.hadith.sourceAndGrade}</SectionTitle>
      <Card tone="alt" style={{ gap: Spacing.sm }}>
        {body.attribution ? (
          <InfoLine icon="book-outline" label={t.hadith.reference} value={body.attribution} />
        ) : null}
        {body.grade ? <InfoLine icon="check-decagram-outline" label={t.hadith.grade} value={body.grade} /> : null}
        {body.gradeAr ? (
          <AppText style={{ fontFamily: Fonts.arabic, fontSize: 17, lineHeight: 30, textAlign: 'right' }} color="textSecondary">
            {body.gradeAr}
          </AppText>
        ) : null}
        <AppText variant="caption" color="textMuted">
          {t.hadith.gradeInfo}
        </AppText>
        <Pressable onPress={() => Linking.openURL(`https://hadeethenc.com/${lang}/browse/hadith/${hid}`).catch(() => {})} hitSlop={6} style={styles.link}>
          <Icon name="open-in-new" size={16} color={theme.primary} />
          <AppText variant="caption" color="primary" style={{ fontWeight: '600' }}>
            {t.hadith.openSource} (#{hid})
          </AppText>
        </Pressable>
      </Card>

      {/* Weitere Hadithe zum Thema */}
      {extra.related.length ? (
        <>
          <SectionTitle>{t.hadith.related}</SectionTitle>
          <View>
            {extra.related.map((h) => (
              <HadithListRow key={h.id} item={h} favorite={favorites.includes(h.id)} />
            ))}
          </View>
        </>
      ) : null}

      {/* Vorheriger / nächster in der Liste, aus der man kam */}
      {extra.total > 1 && extra.pos >= 0 ? (
        <View style={styles.pager}>
          <Pressable
            disabled={!extra.prev}
            onPress={() => extra.prev && open(extra.prev.id)}
            style={({ pressed }) => [styles.pagerBtn, { borderColor: theme.border, opacity: !extra.prev ? 0.35 : pressed ? 0.7 : 1 }]}
            accessibilityRole="button">
            <Icon name="chevron-left" color={theme.primary} />
            <AppText variant="label" color="primary">
              {t.hadith.previous}
            </AppText>
          </Pressable>
          <AppText variant="caption" color="textMuted">
            {t.hadith.position(extra.pos + 1, extra.total)}
          </AppText>
          <Pressable
            disabled={!extra.next}
            onPress={() => extra.next && open(extra.next.id)}
            style={({ pressed }) => [styles.pagerBtn, { borderColor: theme.border, opacity: !extra.next ? 0.35 : pressed ? 0.7 : 1 }]}
            accessibilityRole="button">
            <AppText variant="label" color="primary">
              {t.hadith.next}
            </AppText>
            <Icon name="chevron-right" color={theme.primary} />
          </Pressable>
        </View>
      ) : null}

      <AppText variant="caption" color="textMuted">
        {t.hadith.sourceNote} · #{hid}
      </AppText>
    </Screen>
  );
}

function SourceBadge({ label, strong }: { label: string; strong?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: strong ? theme.primarySoft : theme.cardAlt }]}>
      <Icon name="book-outline" size={14} color={theme.primary} />
      <AppText variant="caption" color="primary" style={{ fontWeight: '600' }}>
        {label}
      </AppText>
    </View>
  );
}

function InfoLine({ icon, label, value }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
      <Icon name={icon} size={18} color={theme.primary} />
      <View style={{ flex: 1 }}>
        <AppText variant="caption" color="textSecondary">
          {label}
        </AppText>
        <AppText>{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  crumbs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  pagerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
