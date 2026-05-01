import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dragon.notes',
  appName: 'Dragon Notes',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
