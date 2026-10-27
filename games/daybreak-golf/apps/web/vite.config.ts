import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/daybreak-golf/' : '/',
  server: { proxy: { '/api': 'http://127.0.0.1:3001' } },
}));
