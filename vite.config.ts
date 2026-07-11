import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Локальний Supabase (npx supabase start) — Kong API на 48000.
const SUPABASE_LOCAL = 'http://127.0.0.1:48000';

// У Codespaces браузер не бачить 127.0.0.1 всередині контейнера, тож ходимо
// на цей самий origin (порт 5174), а Vite проксіює шляхи Supabase на Kong.
// Kong маршрутизує саме за цими префіксами.
const supabaseProxy = ['/auth', '/rest', '/storage', '/functions', '/realtime', '/graphql'];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: Object.fromEntries(
      supabaseProxy.map((path) => [
        path,
        { target: SUPABASE_LOCAL, changeOrigin: true, ws: true },
      ]),
    ),
  },
});
