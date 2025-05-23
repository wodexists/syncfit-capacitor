import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syncfit.app',
  appName: 'syncfit',
  webDir: 'dist/public',  // Changed to just 'dist' since that's your build output
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"]
    }
  }
};

export default config;
