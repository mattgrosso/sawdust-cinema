import { defineConfig } from 'vitest/config'
// Unit tests: the Lambda's pure parts. Rules tests run against the emulator
// via `yarn test:rules` (vitest.rules.config.mjs).
export default defineConfig({ test: { include: ['api/**/*.test.mjs', 'tests/unit/**/*.test.mjs'] } })
