import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Render sert l'application sous son propre nom d'hôte.
  preview: { allowedHosts: true },
});
