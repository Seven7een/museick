import path from "path";
import { fileURLToPath } from "url";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file variables into process.env
const env = loadEnv('', process.cwd(), '');
// e.g. http://museick-backend:8080 or http://127.0.0.1:8080
const apiTarget = env.VITE_BACKEND_API_ADDR || 'http://127.0.0.1:8080';


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Alias for src directory
    },
  },
  server: {
    host: "0.0.0.0", // Allow access from network
    port: 5173, // Default Vite port
    proxy: {
      // Proxy requests that start with /api/ to the backend server
      '/api/': {
        target: apiTarget,
        changeOrigin: true, // Needed for virtual hosted sites
        secure: false, // Set to true if backend is HTTPS with valid cert
        // No rewrite needed if backend expects /api prefix
        // rewrite: (path: string) => path.replace(/^\/api/, ''),
      },
      // Example proxy for a different backend service if needed
      '/health/': {
        target: apiTarget, // Assuming health check is on the same backend
        changeOrigin: true, // Needed for virtual hosted sites
        // Rewrite the path: remove the '/health/' prefix before forwarding
        // e.g., /health/ping -> /ping
        rewrite: (path: string) => path.replace(/^\/health\//, '/'),
        secure: false, // Set to true if backend is HTTPS with valid cert
      },
    }
  }
});