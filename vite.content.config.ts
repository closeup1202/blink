import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Content script는 Chrome이 ES module import를 지원하지 않으므로
// IIFE 포맷으로 별도 빌드 (모든 의존성 인라인)
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false, // 메인 빌드 결과 덮어쓰지 않음
    lib: {
      entry: resolve(__dirname, 'src/content/index.tsx'),
      name: 'BlinkContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
  },
})
