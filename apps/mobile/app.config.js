const appJson = require('./app.json');

module.exports = () => {
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

  const expo = appJson.expo;

  return {
    ...expo,
    android: {
      ...expo.android,
      usesCleartextTraffic: !isProduction,
    },
  };
};
