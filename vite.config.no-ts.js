import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      tsDecorators: false,
      jsxImportSource: 'react',
    })
  ],
  resolve: {
    alias: {
      '@': resolve('./src'),
      '@components': resolve('./src/components'),
      '@features': resolve('./src/features'),
      '@services': resolve('./src/services'),
      '@stores': resolve('./src/stores'),
      '@utils': resolve('./src/utils'),
      '@types': resolve('./src/types'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      onwarn: () => {}, // Suppress all warnings
      external: [], // Don't externalize anything
      output: {
        manualChunks: () => null, // Force single bundle
      }
    },
    target: 'es2015',
    chunkSizeWarningLimit: 3000,
    assetsInlineLimit: 4096,
  },
  esbuild: {
    target: 'es2015',
    logOverride: {
      'this-is-undefined-in-esm': 'silent',
      'commonjs-variable-in-esm': 'silent',
      'import-is-undefined': 'silent',
    },
    legalComments: 'none',
  },
  define: {
    // Ensure environment variables are defined
    'process.env.NODE_ENV': '"production"',
  },
  logLevel: 'error' // Only show errors, not warnings
});