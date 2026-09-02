import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const plugins = [
  react(),
  tailwindcss(),
]

if (process.env.ANALYZE) {
  const { visualizer } = await import('rollup-plugin-visualizer')
  plugins.push(visualizer({
    open: true,
    gzipSize: true,
    brotliSize: true,
    filename: 'dist/stats.html',
  }))
}

export default defineConfig({
  plugins,
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      rgbcolor: path.resolve(__dirname, 'src/vendor/rgbcolor.js'),
      'performance-now': path.resolve(__dirname, 'src/vendor/performance-now.cjs'),
    },
  },
  optimizeDeps: {
    // Keep every react entry in ONE pre-bundled singleton chunk
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor libraries out of the main bundle so the initial
        // payload stays small; they are loaded on demand by their features.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]node_modules[\\/](apexcharts|react-apexcharts|svg.pan-zoom)[\\/]/.test(id)) return 'vendor-charts';
          if (/[\\/]node_modules[\\/](jspdf|html2canvas|xlsx|canvg|core-js|raf|dompurify)[\\/]/.test(id)) return 'vendor-export';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      '.mimocode/**',
      '.opencode/**',
      '.kiro/**',
      'hermes/**',
      'dist/**',
    ],
  },
})
