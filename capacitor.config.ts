import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'gymbuddy',
  webDir: 'out',
  // bundledWebRuntime: false,
  server: {
    hostname: '192.168.1.66:3000',
    cleartext: true,
  },
};

export default config;
