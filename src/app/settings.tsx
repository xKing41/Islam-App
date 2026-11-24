import { View } from 'react-native';

import { AppText, Card, ChoiceList, ListGroup, ListRow, Screen, SectionTitle, Segmented, Stepper, SwitchRow } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useT } from '@/i18n';
import { RECITERS } from '@/lib/quran/audio';
import { getSura, TRANSLATIONS } from '@/lib/quran/data';
import { splitBasmala } from '@/lib/quran/text';
import { type Language, type ThemeMode, type TranslationTr, useSettings } from '@/store/settings';

export default function SettingsScreen() {
  const t = useT();
  const s = useSettings();
  const preview = getSura(112);
  const previewTr = s.language === 'tr' ? s.translationTr : s.translationDe;

  return (
    <Screen>
      <SectionTitle>{t.settings.language}</SectionTitle>
      <Segmented<Language>
        options={[
          { value: 'de', label: 'Deutsch' },
          { value: 'tr', label: 'Türkçe' },
        ]}
        value={s.language}
        onChange={(v) => s.set({ language: v })}
      />

      <SectionTitle>{t.settings.appearance}</SectionTitle>
      <Segmented<ThemeMode>
        options={[
          { value: 'system', label: t.settings.themeSystem },
          { value: 'light', label: t.settings.themeLight },
          { value: 'dark', label: t.settings.themeDark },
        ]}
        value={s.theme}
        onChange={(v) => s.set({ theme: v })}
      />

      <SectionTitle>{t.settings.quran}</SectionTitle>
      <ListGroup>
        <SwitchRow title={t.settings.showTranslation} value={s.showTranslation} onValueChange={(v) => s.set({ showTranslation: v })} />
        <SwitchRow title={t.settings.showTranslit} value={s.showTransliteration} onValueChange={(v) => s.set({ showTransliteration: v })} />
        <SwitchRow title={t.settings.keepAwake} value={s.keepAwake} onValueChange={(v) => s.set({ keepAwake: v })} />
        <ListRow
          title={t.settings.arabicSize}
          right={<Stepper signed={false} value={s.arabicFontSize} min={20} max={44} onChange={(v) => s.set({ arabicFontSize: v })} />}
        />
        <ListRow
          title={t.settings.translationSize}
          last
          right={<Stepper signed={false} value={s.translationFontSize} min={12} max={24} onChange={(v) => s.set({ translationFontSize: v })} />}
        />
      </ListGroup>

      <Card style={{ gap: Spacing.sm }}>
        <AppText variant="small" color="textSecondary">
          {t.settings.preview}
        </AppText>
        <AppText style={{ fontFamily: Fonts.quran, fontSize: s.arabicFontSize, lineHeight: s.arabicFontSize * 2, textAlign: 'right', writingDirection: 'rtl' }}>
          {splitBasmala(112, 1, preview.ar[0]).rest}
        </AppText>
        {s.showTranslation ? (
          <AppText color="textSecondary" style={{ fontSize: s.translationFontSize, lineHeight: s.translationFontSize * 1.5 }}>
            {preview[previewTr][0]}
          </AppText>
        ) : null}
      </Card>

      <SectionTitle>{t.settings.translationTr}</SectionTitle>
      <ChoiceList<TranslationTr>
        options={(['tr_diyanet', 'tr_vakfi'] as const).map((k) => ({
          value: k,
          label: TRANSLATIONS[k].name,
          subtitle: `${TRANSLATIONS[k].source} · ${TRANSLATIONS[k].version}`,
        }))}
        value={s.translationTr}
        onChange={(v) => s.set({ translationTr: v })}
      />

      <SectionTitle>{t.settings.translationDe}</SectionTitle>
      <ChoiceList
        options={[{ value: 'de_bubenheim' as const, label: TRANSLATIONS.de_bubenheim.name, subtitle: `QuranEnc · ${TRANSLATIONS.de_bubenheim.version}` }]}
        value={s.translationDe}
        onChange={(v) => s.set({ translationDe: v })}
      />

      <SectionTitle>{t.settings.reciter}</SectionTitle>
      <ChoiceList
        options={RECITERS.map((r) => ({ value: r.id, label: r.name, subtitle: r.style }))}
        value={s.reciter}
        onChange={(v) => s.set({ reciter: v })}
      />

      <SectionTitle>{t.settings.hijriOffset}</SectionTitle>
      <ListGroup>
        <ListRow
          title={t.settings.hijriOffset}
          last
          right={<Stepper value={s.hijriOffset} min={-2} max={2} onChange={(v) => s.set({ hijriOffset: v })} />}
        />
      </ListGroup>
      <View style={{ height: Spacing.lg }} />
    </Screen>
  );
}
