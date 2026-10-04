import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
// The backend URL comes from VITE_BACKEND_URL in .env (see README).
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
