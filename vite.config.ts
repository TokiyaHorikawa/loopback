import { defineConfig } from 'vite-plus'

export default defineConfig({
  lint: {
    ignorePatterns: ['**/dist/**', '**/node_modules/**'],
  },
  fmt: {
    semi: false,
    singleQuote: true,
    insertFinalNewline: true,
    sortImports: {},
  },
  test: {
    include: ['packages/*/src/**/*.test.ts'],
  },
})
