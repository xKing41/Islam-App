import { type AudioPlaylist, createAudioPlaylist } from 'expo-audio';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Transliteration } from '@/components/transliteration';
import { AppText, Card, Icon, ListGroup, ListRow, Screen, SectionTitle, Segmented, SwitchRow } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { QURAN_DUA_GROUPS, type QuranDua, SUNNAH_DUA_CATEGORY_IDS } from '@/lib/duas';
import { getCategory, hadithsInCategory } from '@/lib/hadith/data';
import { ayahAudioUrl } from '@/lib/quran/audio';
import { getSura } from '@/lib/quran/data';
import { getSuraMeta, suraTitle } from '@/lib/quran/meta';
import { splitBasmala } from '@/lib/quran/text';
import { useSettings } from '@/store/settings';

type Tab = 'quran' | 'sunnah';

export default function DuasScreen() {
  const t = useT();
  const lang = useSettings((s) => s.language);
  const [tab, setTab] = useState<Tab>('quran');
  const [translit, setTranslit] = useState(true);
  const player = useVersePlayer();

  const sunnahCats = useMemo(
    () =>
      SUNNAH_DUA_CATEGORY_IDS.map((id) => {
        const c = getCategory(lang, id);
        return c ? { id, title: c.title, count: hadithsInCategory(lang, id).length } : null;
      }).filter((c): c is { id: number; title: string; count: number } => !!c && c.count > 0),
    [lang]
  );

  return (
    <Screen>
      <Segmented<Tab>
        options={[
          { value: 'quran', label: t.duas.quran },
          { value: 'sunnah', label: t.duas.sunnah },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'quran' ? (
        <>
          <AppText variant="caption" color="textSecondary">
            {t.duas.quranIntro}
          </AppText>
          <ListGroup>
            <SwitchRow title={t.duas.translit} value={translit} onValueChange={setTranslit} icon="alphabet-latin" last />
          </ListGroup>
          {QURAN_DUA_GROUPS.map((g) => (
            <View key={g.id} style={{ gap: Spacing.md }}>
              <SectionTitle>{g.title[lang]}</SectionTitle>
              {g.items.map((d) => (
                <DuaCard
                  key={`${d.sura}:${d.from}`}
                  dua={d}
                  lang={lang}
                  translit={translit}
                  playing={player.current === `${d.sura}:${d.from}`}
                  onPlay={() => player.toggle(d)}
                />
              ))}
            </View>
          ))}
        </>
      ) : (
        <>
          <AppText variant="caption" color="textSecondary">
            {t.duas.sunnahIntro}
          </AppText>
          <ListGroup>
            {sunnahCats.map((c, i) => (
              <ListRow
                key={c.id}
                icon={i === 0 ? 'hands-pray' : 'format-quote-open'}
                title={c.title}
                subtitle={t.hadith.count(c.count)}
                chevron
                last={i === sunnahCats.length - 1}
                onPress={() => router.push({ pathname: '/hadith/category/[id]', params: { id: c.id } })}
              />
            ))}
          </ListGroup>
          <AppText variant="caption" color="textMuted" style={{ textAlign: 'center' }}>
            {t.hadith.sourceNote}
          </AppText>
        </>
      )}
    </Screen>
  );
}

function DuaCard({
  dua,
  lang,
  translit,
  playing,
  onPlay,
}: {
  dua: QuranDua;
  lang: 'de' | 'tr';
  translit: boolean;
  playing: boolean;
  onPlay: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  const translationKey = useSettings((s) => (s.language === 'tr' ? s.translationTr : s.translationDe));
  const data = getSura(dua.sura);
  const meta = getSuraMeta(dua.sura);
  const ref = `${suraTitle(meta, lang).name} ${dua.sura}:${dua.from}${dua.to > dua.from ? `–${dua.to}` : ''}`;
  const ayat = [];
  for (let a = dua.from; a <= dua.to; a++) ayat.push(a);

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm }}>
        <Pressable
          onPress={() => router.push({ pathname: '/sura/[id]', params: { id: dua.sura, aya: dua.from } })}
          accessibilityRole="link"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
          <Icon name="book-open-page-variant" size={16} color={theme.primary} />
          <AppText variant="caption" color="primary" style={{ fontWeight: '700' }} numberOfLines={1}>
            {ref}
          </AppText>
        </Pressable>
        <Pressable onPress={onPlay} hitSlop={10} accessibilityLabel={t.duas.play}>
          <Icon name={playing ? 'stop-circle-outline' : 'play-circle-outline'} size={28} color={theme.primary} />
        </Pressable>
      </View>
      {dua.note ? (
        <AppText variant="caption" color="accent" style={{ fontWeight: '600' }}>
          {dua.note[lang]}
        </AppText>
      ) : null}
      {ayat.map((a) => (
        <View key={a} style={{ gap: Spacing.sm }}>
          <AppText style={{ fontFamily: Fonts.quran, fontSize: 25, lineHeight: 50, textAlign: 'right', writingDirection: 'rtl' }}>
            {splitBasmala(dua.sura, a, data.ar[a - 1]).rest}
          </AppText>
          {translit ? (
            <Transliteration lang={lang} text={lang === 'tr' ? data.translit_tr[a - 1] : data.translit_en[a - 1]} />
          ) : null}
          <AppText color="textSecondary" style={{ lineHeight: 23 }}>
            {data[translationKey][a - 1]}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

/** Spielt die Verse einer Dua nacheinander ab (EveryAyah, eingestellter Rezitator). */
function useVersePlayer() {
  const reciter = useSettings((s) => s.reciter);
  const ref = useRef<AudioPlaylist | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

  const stop = () => {
    try {
      ref.current?.pause();
      ref.current?.destroy();
    } catch {}
    ref.current = null;
    setCurrent(null);
  };

  useEffect(() => stop, []);

  const toggle = (d: QuranDua) => {
    const key = `${d.sura}:${d.from}`;
    if (current === key) {
      stop();
      return;
    }
    stop();
    const sources: string[] = [];
    for (let a = d.from; a <= d.to; a++) sources.push(ayahAudioUrl(reciter, d.sura, a));
    const pl = createAudioPlaylist({ sources });
    pl.addListener('playlistStatusUpdate', (st) => {
      if (st.didJustFinish && st.currentIndex >= sources.length - 1) stop();
    });
    ref.current = pl;
    setCurrent(key);
    pl.play();
  };

  return { current, toggle };
}
