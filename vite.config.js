import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
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
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // Exclude worker chunks and WASM files — sqlite-wasm uses dynamic import.meta.url
        // internally which vite-plugin-pwa cannot resolve during build
        globPatterns: ["**/*.{css,html,ico,png,svg}"],
        globIgnores: ["**/*worker*", "**/*.wasm"],
        navigateFallback: "index.html",
        dontCacheBustURLsMatching: /-[a-f0-9]{8}\./,
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  worker: {
    format: "es", // Pastikan format worker tetap ES module
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    rollupOptions: {
      output: {
        // Memaksa format penamaan file yang konsisten untuk aset
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
  base: "/",
});
