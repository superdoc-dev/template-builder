// vite.config.ts
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            formats: ['es', 'cjs'],
            fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.js'),
            // This tells Vite to name the CSS file
            cssFileName: 'style'
        },
        rollupOptions: {
            external: ['superdoc'],
            output: {
                assetFileNames: '[name].[ext]'
            }
        }
    },
    plugins: [dts()]
});