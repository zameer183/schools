import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.manarah.schools',
  appName: 'Manarah Institute',
  webDir: 'public',
  server: {
    url: 'https://schools-plum.vercel.app',
    cleartext: false
  }
};

export default config;
