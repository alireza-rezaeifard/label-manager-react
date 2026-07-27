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
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
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
