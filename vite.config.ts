import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/",
  build: {
    target: "es2022",
    cssMinify: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
