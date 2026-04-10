import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'it.glicolog.app',
  appName: 'GlicoLog',
  webDir: 'dist',
  android: {
    backgroundColor: '#080b10',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    HealthConnect: {
      // Il plugin legge da Health Connect — nessuna config extra necessaria
    },
  },
}

export default config
