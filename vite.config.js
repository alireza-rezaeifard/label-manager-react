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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    exclude: ['node_modules/**', 'server/**'],
  },
})
