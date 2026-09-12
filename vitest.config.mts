import { defineConfig } from 'vitest/config'

// Engine and sim only. The React Native app is not unit-tested.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
