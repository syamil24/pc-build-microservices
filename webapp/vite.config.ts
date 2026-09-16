import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const api = process.env.VITE_API_PROXY || "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": api
    }
  },
  preview: {
    port: 5173,
    proxy: {
      "/api": api
    }
  }
});
