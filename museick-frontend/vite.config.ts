import path from "path";
import { fileURLToPath } from "url";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = loadEnv('', process.cwd(), '');
// e.g. http://museick-backend:8080
const apiTarget = env.VITE_BACKEND_API_ADDR || 'http://localhost:8080';


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    proxy: {
      // Proxy requests that start with /api/
      '/api/': {
        target: apiTarget,
        changeOrigin: true, // Needed for virtual hosted sites
        // Rewrite the path: remove the '/api/' prefix before forwarding
        // e.g., /api/users -> /users
        secure: false, // Set to true if backend is HTTPS with valid cert
      },
      '/health/': {
        target: apiTarget,
        changeOrigin: true, // Needed for virtual hosted sites
        // Rewrite the path: remove the '/api/' prefix before forwarding
        // e.g., /api/users -> /users
        rewrite: (path: string) => path.replace(/^\/health\//, ''),
        secure: false, // Set to true if backend is HTTPS with valid cert
      },
    }
  }
});