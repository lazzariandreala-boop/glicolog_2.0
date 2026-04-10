import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GlicoLog',
        short_name: 'GlicoLog',
        description: 'Diario personale per la gestione del diabete',
        theme_color: '#080b10',
        background_color: '#080b10',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  // CAPACITOR=1 → base '/' per APK Android
  // VERCEL=1    → base '/' per deploy Vercel
  // default     → '/glicolog_2.0/' per GitHub Pages
  base: (process.env.CAPACITOR === '1' || process.env.VERCEL === '1') ? '/' : '/glicolog_2.0/',
  resolve: {
    alias: { '@': '/src' }
  }
})
