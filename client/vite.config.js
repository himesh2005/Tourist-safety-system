import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_TARGET = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/auth": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/me": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/my-card": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
