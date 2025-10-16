import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [],
  esbuild: {
    jsx: 'automatic'
  },
  optimizeDeps: {
    include: ["jquery"],
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/process": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/data": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
