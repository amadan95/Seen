import type { ExpoConfig } from 'expo/config';

const variant = process.env.APP_VARIANT ?? 'development';
if (!['development', 'staging', 'production'].includes(variant))
  throw new Error('Invalid APP_VARIANT');
const suffix = variant === 'production' ? '' : `.${variant}`;
const config: ExpoConfig = {
  name: variant === 'production' ? 'Seen' : `Seen ${variant === 'staging' ? 'Staging' : 'Dev'}`,
  slug: 'seen',
  version: '0.1.0',
  scheme: `seen${variant === 'production' ? '' : `-${variant}`}`,
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  platforms: ['ios', 'web'],
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: `com.amadan95.seen${suffix}`,
    supportsTablet: false,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    ['expo-build-properties', { ios: { deploymentTarget: '17.0', enableSceneSupport: true } }],
  ],
  web: { bundler: 'metro', output: 'single', name: 'Seen Preview' },
  experiments: { typedRoutes: true },
  extra: { appVariant: variant, previewMode: true },
};
export default config;
