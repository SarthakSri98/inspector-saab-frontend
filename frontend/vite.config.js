import { defineConfig } from 'vite';

export default defineConfig({
    root: './',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                content: 'content.js',
                background: 'background.js',
                popup: 'popup.html'
            },
            output: {
                entryFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
            }
        }
    }
});
