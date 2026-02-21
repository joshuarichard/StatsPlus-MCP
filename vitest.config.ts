import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    // Allow importing .js files that resolve to .ts source
    extensions: [".ts", ".js"],
  },
});
