import { defineConfig } from "vitest/config";

// Config para vitest. Hereda jsx automatic vía oxc (default en vitest 4).
// No reusamos vite.config.js para evitar arrastrar el plugin de PWA al test runner.
export default defineConfig({
  test: {
    include: ["src/**/*.test.{js,jsx}"],
    environment: "node",
  },
});
