import { defineConfig } from "vite";
import { resolve } from "node:path";

// Standalone editor app. The package root is `editor/` so the build output
// is self-contained and can be deployed by itself.
export default defineConfig({
  root: resolve(__dirname),
  base: "./",
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5180,
    open: true,
  },
});
