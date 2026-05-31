import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.notqi.app',
  appName: 'نطقي',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#7C3AED",
      showSpinner: false,
      androidScaleType: "CENTER_CROP"
    }
  },
  server: {
    cleartext: false
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  }
};

export default config;
