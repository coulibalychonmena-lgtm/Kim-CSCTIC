import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { createSeoHtmlPlugin } from './scripts/seo-html-plugin.mjs';

// --- Référencement : adresse publique et vérifications de propriété, injectées dans index.html au build ---
const siteUrl = (process.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');
const googleVerification = (process.env.VITE_GOOGLE_SITE_VERIFICATION || '').trim();
const bingVerification = (process.env.VITE_BING_SITE_VERIFICATION || '').trim();
if (!siteUrl) console.warn('[SEO] VITE_SITE_URL absent : canonique, Open Graph et JSON-LD statiques retirés de index.html, sitemap non généré.');

const seoHtml = () => createSeoHtmlPlugin({ siteUrl, googleVerification, bingVerification });

export default defineConfig({
  plugins: [
    react(),
    seoHtml(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Kim — CSCTICAO',
        short_name: 'Kim CSCTICAO',
        description: 'Kim, assistant du Centre Sportif, Culturel et des TIC Ivoiro-Coréen Alassane Ouattara : salles, formations, partenariats.',
        lang: 'fr', start_url: '/', scope: '/', display: 'standalone',
        background_color: '#ffffff', theme_color: '#f04c23',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Les pages sont toutes servies par index.html : actualiser ou ouvrir un lien direct ne donne jamais de 404.
        navigateFallback: '/index.html',
        // Les fichiers destinés aux robots ne doivent jamais être remplacés par l'application par le service worker.
        navigateFallbackDenylist: [/^\/sitemap\.xml$/, /^\/robots\.txt$/, /^\/llms\.txt$/, /^\/og-image\.jpg$/],
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,ico,webmanifest}'],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.origin === 'https://res.cloudinary.com', handler: 'StaleWhileRevalidate', options: { cacheName: 'cloudinary-images', expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
          { urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com', handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
        ],
      },
    }),
  ],
  server: { port: 5173 },
  preview: { allowedHosts: true },
});
