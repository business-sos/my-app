import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import devApiPlugin from './dev-api-plugin.js';

export default defineConfig(({ mode }) => {
  // Surface .env.local server-only vars to the dev-api plugin (Vite normally only exposes VITE_* to the client).
  const env = loadEnv(mode, process.cwd(), '');
  for (const k of Object.keys(env)) {
    if (process.env[k] == null) process.env[k] = env[k];
  }
  return {
    plugins: [react(), devApiPlugin()],
    server: { port: 5174 },
    build: { outDir: 'dist' },
  };
});
