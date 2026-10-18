// Vite configuration for the React frontend.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During development, any request to /api is forwarded to our Express
    // server on port 3001. This way the browser never needs the API key.
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
