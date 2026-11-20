import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { bannerUnitId, initAds, loadAds } from '../lib/ads';
import { usePremium } from '../lib/premium';
import { useAuth } from '../lib/auth';
import { Txt } from './ui';

/** Small banner for free families, parent screens only. Renders nothing when ads are off. */
export function AdBanner() {
  const { user } = useAuth();
  const { limits, config, loaded } = usePremium();
  const [ready, setReady] = useState(false);
  const show = loaded && user?.role === 'parent' && limits.showAds && config.adsEnabled && !!bannerUnitId();

  useEffect(() => {
    if (show) void initAds().then(setReady);
  }, [show]);

  if (!show || !ready) return null;
  const m = loadAds();
  if (!m) return null;
  const { BannerAd, BannerAdSize } = m;
  return (
    <View style={{ alignItems: 'center', gap: 4, marginTop: 4 }}>
      <Txt v="tiny" muted align="center">
        פרסומת. בפרימיום אין פרסומות
      </Txt>
      <BannerAd
        unitId={bannerUnitId()!}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}
