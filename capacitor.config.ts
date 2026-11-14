export interface CapacitorAppConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  server?: {
    androidScheme?: string;
  };
  plugins?: Record<string, Record<string, unknown>>;
}

const config: CapacitorAppConfig = {
  appId: 'com.realisticfishing3d.game',
  appName: 'Realistic Fishing 3D',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#07131f',
      showSpinner: false,
    },
  },
};

export default config;
