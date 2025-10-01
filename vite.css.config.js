// vite.css.config.js
import { defineConfig } from 'vite';
import postcssImport from 'postcss-import';

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/style.css',
      formats: []  // No JS output
    },
    rollupOptions: {
      output: {
        assetFileNames: '[name].[ext]'
      }
    }
  },
  css: {
    postcss: {
      plugins: [
        postcssImport()  // This resolves @import
      ]
    }
  }
});