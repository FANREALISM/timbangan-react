import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: 'auto',
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "Tconnect Scale System",
        short_name: "Tconnect",
        description: "Aplikasi Timbangan Digital V4.0",
        theme_color: "#1a1a1a",
        background_color: "#1a1a1a",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // Gabungkan assets agar bisa jalan saat offline
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],
        // Hindari konflik caching pada file worker yang diproses Vite
        navigateFallback: "index.html",
        donotCacheBustURLsMatching: new RegExp('^[a-f0-9]{8}$'),
      },
    }),
  ],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  worker: {
    // Pastikan format worker adalah ES module
    format: 'es',
  },
  build: {
    target: 'esnext', // Penting untuk mendukung fitur BigInt/OPFS di SQLite
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Mengatur pola penamaan agar tidak terjadi "unknown file"
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  base: "/", 
});