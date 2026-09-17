import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/",
  build: {
    target: "es2022",
    cssMinify: true,
    rollupOptions: { input: { main:"index.html", editor:"editor.html" } },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
