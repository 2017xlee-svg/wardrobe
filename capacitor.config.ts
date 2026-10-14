import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wardroberecords.app',
  appName: 'Wardrobe Diary',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
