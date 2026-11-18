import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

function resolveBasePath() {
  if (process.env.GITHUB_PAGES !== 'true') {
    return './';
  }

  const repository = process.env.GITHUB_REPOSITORY?.split('/').at(-1);
  return repository ? `/${repository}/` : './';
}

export default defineConfig({
  base: resolveBasePath(),
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        evolution: fileURLToPath(
          new URL('./evolution/index.html', import.meta.url)
        ),
      },
    },
  },
  server: {
    fs: {
      allow: ['../..'],
    },
  },
});
