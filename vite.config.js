import { defineConfig } from 'vite'
import glslify from 'rollup-plugin-glslify'
import * as path from 'path'

export default defineConfig({
  root: 'src',
  base: './', // Use './' for local paths
  build: {
    outDir: '../dist',
  },
  server: {
    host: true, // to test on other devices with IP address
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [glslify()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern', // Use the modern API
        additionalData: `@import "@/scss/imports/index";` // Adjust the path as needed
      }
    }
  }
})
