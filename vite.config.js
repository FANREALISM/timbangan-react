import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: 'auto', // Tambahkan ini agar PWA terdaftar otomatis
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
        // Gabungkan wasm agar bisa jalan saat offline
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],
        // Hapus runtimeCaching /api jika Anda sudah full menggunakan SQLite WASM lokal
        // Karena kita tidak lagi memanggil API server
      },
    }),
  ],
  server: {
    // Header ini WAJIB untuk SQLite WASM / OPFS
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext', // Mendukung fitur modern OPFS
  },
  // Saran: Gunakan "/" (absolute) bukan "./" (relative) 
  // agar path worker dan wasm tidak berantakan
  base: "/", 
});