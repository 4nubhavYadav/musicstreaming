import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sora.audio',
  appName: 'Sora',
  webDir: 'dist',
  server: {
    url: 'https://sora-audio.pages.dev',
    cleartext: false,
    allowNavigation: [
      'sora-audio.pages.dev',
      '*.sora-audio.pages.dev'
    ],
    errorPath: 'offline.html'
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
