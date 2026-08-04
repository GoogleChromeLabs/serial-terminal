import checker from 'vite-plugin-checker';
import {VitePWA} from 'vite-plugin-pwa';

export default {
  base: './',
  plugins: [
    checker({eslint: {lintCommand: 'eslint .', useFlatConfig: true}}),
    // eslint-disable-next-line new-cap -- VitePWA is a factory, not a class.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        short_name: 'Serial Terminal',
        name: 'Serial Terminal',
        icons: [
          {
            src: 'images/icons-1024.png',
            type: 'image/png',
            sizes: '1024x1024',
            purpose: 'any maskable',
          },
          {
            src: 'images/icons-192.png',
            type: 'image/png',
            sizes: '192x192',
            purpose: 'any maskable',
          },
          {
            src: 'images/icons-512.png',
            type: 'image/png',
            sizes: '512x512',
            purpose: 'any maskable',
          },
        ],
        start_url: './?source=pwa',
        display: 'standalone',
        scope: './',
        id: './',
      },
    }),
  ],
};
