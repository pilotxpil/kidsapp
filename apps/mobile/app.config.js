/**
 * Dynamic Expo config on top of app.json.
 *
 * EAS env (per profile) — all optional except EXPO_PUBLIC_API_URL in production:
 *   EXPO_PUBLIC_API_URL            https://kids.synaboard.com
 *   EXPO_PUBLIC_RC_ANDROID_KEY     RevenueCat public SDK key (goog_…)   → enables the paywall purchase
 *   EXPO_PUBLIC_RC_IOS_KEY         RevenueCat public SDK key (appl_…)
 *   ADMOB_ANDROID_APP_ID           ca-app-pub-…~…   (AdMob app id; sample id is used when unset)
 *   ADMOB_IOS_APP_ID               ca-app-pub-…~…
 *   EXPO_PUBLIC_ADMOB_BANNER_ANDROID  ca-app-pub-…/…  (banner unit; unset → no ads at all)
 *   EXPO_PUBLIC_ADMOB_BANNER_IOS      ca-app-pub-…/…
 */
// Google's published sample app ids. The Mobile Ads SDK needs *an* app id at build time or it
// crashes on launch; with no banner unit id configured the app never requests an ad.
const SAMPLE_ADMOB_ANDROID = 'ca-app-pub-3940256099942544~3347511713';
const SAMPLE_ADMOB_IOS = 'ca-app-pub-3940256099942544~1458002511';

module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE;
  const isProduction = profile === 'production';
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (isProduction) {
    if (!apiUrl) {
      throw new Error(
        'EXPO_PUBLIC_API_URL is required for production builds. Create it with: npx eas-cli env:create --name EXPO_PUBLIC_API_URL --value https://YOUR-API --environment production --visibility plaintext --scope project',
      );
    }
    if (!apiUrl.startsWith('https://')) {
      throw new Error('EXPO_PUBLIC_API_URL must use HTTPS in production Play Store builds');
    }
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: !isProduction,
          },
        },
      ],
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: process.env.ADMOB_ANDROID_APP_ID || SAMPLE_ADMOB_ANDROID,
          iosAppId: process.env.ADMOB_IOS_APP_ID || SAMPLE_ADMOB_IOS,
          // Families policy: no measurement before we set child-directed request config.
          delayAppMeasurementInit: true,
        },
      ],
    ],
  };
};
