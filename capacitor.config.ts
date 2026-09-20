import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'au.com.siterun.app',
  appName: 'SiteRun',
  webDir: 'dist',
  // The native apps open at Welcome, never the marketing page.
  server: { androidScheme: 'https' },
  backgroundColor: '#0B1F44',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0B1F44',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: { style: 'DARK', backgroundColor: '#0B1F44', overlaysWebView: false },
    Keyboard: { resize: 'body', resizeOnFullScreen: true },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
}

export default config
