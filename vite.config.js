import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false
    },
    server: {
        port: 3000,
        open: false
    },
    preview: {
        port: 4173
    }
});