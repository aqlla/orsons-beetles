import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/orsons-beetles/',
  assetsInclude: ['geometries/*.json'],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        worldview: resolve(__dirname, 'worldview/index.html'),
      },
    },
  },
})