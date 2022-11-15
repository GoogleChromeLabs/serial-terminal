import eslint from 'vite-plugin-eslint'
import { VitePWA } from 'vite-plugin-pwa'
import webmanifest from './src/manifest.json';

export default {
  base: './',
  plugins: [
    eslint(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: webmanifest,
    })
  ]
}
