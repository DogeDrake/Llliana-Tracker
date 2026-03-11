import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  // Tu versión simplificada (más robusta para tu flujo)
  base: process.env.CAPACITOR_BUILD ? "./" : "/Lilliana-Tracker/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
