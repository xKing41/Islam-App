import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ChoiceList,
  ListGroup,
  ListRow,
  PlayButton,
  Radio,
  Screen,
  SectionTitle,
  Segmented,
  Stepper,
  SwitchRow,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSamplePlayer } from '@/hooks/use-sample-player';
import { useT } from '@/i18n';
import { AZAN_VOICES, type AzanLength, azanSound, FAJR_AZAN, parseAzanSound } from '@/lib/azan';
import {
  getPermissionState,
  type PermissionState,
  requestExactAlarmPermission,
  requestNotificationPermission,
  sendTestNotification,
} from '@/lib/notifications';
import { PRAYER_KEYS } from '@/lib/prayer-times';
import { type CalcMethod, type HighLatRule, type NotificationSound, useSettings } from '@/store/settings';

const METHODS: CalcMethod[] = ['Turkey', 'MuslimWorldLeague', 'NorthAmerica', 'Egyptian', 'Karachi', 'UmmAlQura', 'MoonsightingCommittee'];

export default function PrayerSettingsScreen() {
  const t = useT();
  const s = useSettings();
  const [perm, setPerm] = useState<PermissionState | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getPermissionState().then(setPerm).catch(() => {});
    }, [])
  );

  // Ein gemeinsamer Ton für alle Gebete (außer Sonnenaufgang).
  const currentSound = s.notify.dhuhr.sound;
  const azan = parseAzanSound(currentSound);
  const length: AzanLength = azan?.length ?? 'short';
  const sample = useSamplePlayer();
  const fajrAzan = FAJR_AZAN;
  function setSoundForAll(sound: NotificationSound) {
    for (const key of PRAYER_KEYS) {
      if (key !== 'sunrise') s.setNotify(key, { sound });
    }
  }

  const isNative = Platform.OS !== 'web';

  return (
    <Screen>
      <ListGroup>
        <ListRow
          icon="map-marker"
          title={t.more.location}
          subtitle={s.location?.name ?? t.home.noLocationTitle}
          chevron
          last
          onPress={() => router.push('/location')}
        />
      </ListGroup>

      <SectionTitle>{t.prayerSettings.reminders}</SectionTitle>
      <AppText variant="caption" color="textSecondary">
        {t.prayerSettings.remindersHint}
      </AppText>

      {isNative && perm && !perm.notifications ? (
        <Card tone="accent" style={{ gap: Spacing.sm }}>
          <AppText>{t.prayerSettings.permissionMissing}</AppText>
          <Button
            title={t.common.open}
            icon="bell-ring-outline"
            onPress={async () => {
              await requestNotificationPermission();
              setPerm(await getPermissionState());
            }}
          />
        </Card>
      ) : null}
      {isNative && perm && perm.notifications && !perm.exactAlarms ? (
        <Card tone="accent" style={{ gap: Spacing.sm }}>
          <AppText>{t.prayerSettings.exactAlarmMissing}</AppText>
          <Button
            title={t.prayerSettings.allowExact}
            icon="alarm-check"
            onPress={async () => {
              await requestExactAlarmPermission();
              setPerm(await getPermissionState());
            }}
          />
        </Card>
      ) : null}

      <ListGroup>
        {PRAYER_KEYS.map((key, i) => (
          <SwitchRow
            key={key}
            title={t.prayers[key]}
            subtitle={t.prayerHints[key]}
            value={s.notify[key].enabled}
            onValueChange={(v) => s.setNotify(key, { enabled: v })}
            last={i === PRAYER_KEYS.length - 1}
          />
        ))}
      </ListGroup>

      <SectionTitle>{t.prayerSettings.sound}</SectionTitle>
      <ListGroup>
        {AZAN_VOICES.map((v) => {
          const label = t.azan.voices[v.id];
          const playing = sample.current === v.id;
          return (
            <ListRow
              key={v.id}
              title={label.name}
              subtitle={`${label.detail} · ${t.azan.duration(length === 'short' ? v.shortSeconds : v.seconds)}`}
              onPress={() => setSoundForAll(azanSound(v, length))}
              accessibilityLabel={`${t.azan.channel}: ${label.name}`}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  {isNative ? (
                    <PlayButton
                      playing={playing}
                      loading={sample.loading}
                      onPress={() => sample.toggle(v.id, [azanSound(v, length)])}
                      label={`${playing ? t.azan.stop : t.azan.play}: ${label.name}`}
                    />
                  ) : null}
                  <Radio selected={azan?.voice.id === v.id} />
                </View>
              }
            />
          );
        })}
        {(['default', 'silent'] as const).map((v, i) => (
          <ListRow
            key={v}
            title={t.prayerSettings.sounds[v]}
            last={i === 1}
            onPress={() => setSoundForAll(v)}
            right={<Radio selected={currentSound === v} />}
          />
        ))}
      </ListGroup>
      {azan ? (
        <ListGroup>
          <View style={{ padding: Spacing.lg, gap: Spacing.sm }}>
            <AppText variant="label">{t.azan.length}</AppText>
            <Segmented<AzanLength>
              options={[
                { value: 'short', label: t.azan.short },
                { value: 'full', label: t.azan.full },
              ]}
              value={length}
              onChange={(l) => setSoundForAll(azanSound(azan.voice, l))}
            />
          </View>
          <SwitchRow
            title={t.azan.rotate}
            subtitle={t.azan.rotateHint}
            value={s.azanRotate}
            onValueChange={(v) => s.set({ azanRotate: v })}
            last={!fajrAzan || length !== 'full'}
          />
          {fajrAzan && length === 'full' ? (
            <>
              <SwitchRow title={t.azan.fajr} subtitle={t.azan.fajrHint} value={s.fajrAzan} onValueChange={(v) => s.set({ fajrAzan: v })} />
              {isNative ? (
                <ListRow
                  title={t.azan.fajrSample}
                  subtitle={`${t.azan.fajrSource} · ${t.azan.duration(fajrAzan.seconds)}`}
                  last
                  right={
                    <PlayButton
                      playing={sample.current === 'fajr'}
                      loading={sample.loading}
                      onPress={() => sample.toggle('fajr', [fajrAzan.file])}
                      label={`${sample.current === 'fajr' ? t.azan.stop : t.azan.play}: ${t.azan.fajr}`}
                    />
                  }
                />
              ) : null}
            </>
          ) : null}
        </ListGroup>
      ) : null}
      {isNative ? (
        <Button
          title={t.prayerSettings.testNotification}
          icon="bell-ring-outline"
          variant="secondary"
          onPress={async () => {
            const ok = await requestNotificationPermission();
            if (ok) {
              await sendTestNotification(useSettings.getState(), currentSound);
              setInfo(t.prayerSettings.testSent);
            } else {
              setInfo(t.prayerSettings.permissionMissing);
            }
          }}
        />
      ) : null}
      {info ? (
        <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
          {info}
        </AppText>
      ) : null}

      <SectionTitle>{t.prayerSettings.preReminder}</SectionTitle>
      <Segmented
        options={[0, 5, 10, 15, 30].map((m) => ({
          value: m,
          label: m === 0 ? t.prayerSettings.preReminderNone : `${m}`,
        }))}
        value={s.preReminder}
        onChange={(v) => s.set({ preReminder: v })}
      />

      <ListGroup>
        <SwitchRow
          title={t.prayerSettings.reliable}
          subtitle={t.prayerSettings.reliableHint}
          value={s.reliableAlarms}
          onValueChange={(v) => s.set({ reliableAlarms: v })}
          last
        />
      </ListGroup>

      <SectionTitle>{t.prayerSettings.method}</SectionTitle>
      <ChoiceList
        options={METHODS.map((m) => ({ value: m, label: t.methods[m] }))}
        value={s.method}
        onChange={(v) => s.set({ method: v })}
      />

      <SectionTitle>{t.prayerSettings.asr}</SectionTitle>
      <ChoiceList
        options={[
          { value: 'shafi' as const, label: t.prayerSettings.asrStandard },
          { value: 'hanafi' as const, label: t.prayerSettings.asrHanafi },
        ]}
        value={s.madhab}
        onChange={(v) => s.set({ madhab: v })}
      />

      <SectionTitle>{t.prayerSettings.highLat}</SectionTitle>
      <AppText variant="caption" color="textSecondary">
        {t.prayerSettings.highLatHint}
      </AppText>
      <ChoiceList<HighLatRule>
        options={[
          { value: 'auto', label: t.prayerSettings.highLatAuto },
          { value: 'middleofthenight', label: t.prayerSettings.highLatMiddle },
          { value: 'seventhofthenight', label: t.prayerSettings.highLatSeventh },
          { value: 'twilightangle', label: t.prayerSettings.highLatAngle },
        ]}
        value={s.highLatRule}
        onChange={(v) => s.set({ highLatRule: v })}
      />

      <SectionTitle>{t.prayerSettings.adjustments}</SectionTitle>
      <AppText variant="caption" color="textSecondary">
        {t.prayerSettings.adjustmentsHint}
      </AppText>
      <ListGroup>
        {PRAYER_KEYS.map((key, i) => (
          <ListRow
            key={key}
            title={t.prayers[key]}
            last={i === PRAYER_KEYS.length - 1}
            right={<Stepper value={s.adjustments[key]} onChange={(v) => s.setAdjustment(key, v)} />}
          />
        ))}
      </ListGroup>

      <View style={{ paddingTop: Spacing.sm }}>
        <AppText variant="caption" color="textSecondary">
          {t.prayerSettings.approxNote}
        </AppText>
      </View>
    </Screen>
  );
}
