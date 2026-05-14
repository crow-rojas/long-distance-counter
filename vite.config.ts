/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  build: {
    target: "es2022",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  assetsInclude: ["**/*.vert", "**/*.frag", "**/*.glsl"],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
