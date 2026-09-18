import React, { useEffect, useState } from 'react';
import { Platform, Text, StyleSheet, View } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { API_URL } from '../lib/config';
import { isVersionNewer } from '../lib/appUpdate';
import { useTheme } from '../lib/theme-context';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';
import { spacing } from '../constants/theme';

type Status = 'loading' | 'current' | 'outdated' | 'unknown';

export function AppVersionLabel() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<Status>('loading');
  const [latest, setLatest] = useState<string | null>(null);

  const version =
    Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '—';
  const build = Application.nativeBuildVersion;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/app/version`);
        if (!res.ok) {
          if (!cancelled) setStatus('unknown');
          return;
        }
        const data = (await res.json()) as { android?: string; ios?: string };
        const remote =
          Platform.OS === 'ios'
            ? data.ios
            : Platform.OS === 'android'
              ? data.android
              : data.android ?? data.ios;
        const current =
          Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;
        if (!remote || !current) {
          if (!cancelled) setStatus('unknown');
          return;
        }
        if (!cancelled) {
          setLatest(remote);
          setStatus(isVersionNewer(remote, current) ? 'outdated' : 'current');
        }
      } catch {
        if (!cancelled) setStatus('unknown');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const versionLine = build
    ? t('appVersionWithBuild').replace('{version}', version).replace('{build}', build)
    : t('appVersion').replace('{version}', version);

  let statusLine: string | null = null;
  if (status === 'current') statusLine = t('appVersionUpToDate');
  if (status === 'outdated' && latest) {
    statusLine = t('appVersionOutdated').replace('{latest}', latest);
  }

  return (
    <View style={styles.wrap} accessibilityLabel={versionLine}>
      <Text style={[styles.version, { color: colors.textMuted }, rtl.textCenter]}>{versionLine}</Text>
      {statusLine ? (
        <Text
          style={[
            styles.status,
            { color: status === 'outdated' ? colors.primary : colors.textMuted },
            rtl.textCenter,
          ]}
        >
          {statusLine}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    gap: 4,
  },
  version: {
    fontSize: 13,
    fontWeight: '600',
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
});
