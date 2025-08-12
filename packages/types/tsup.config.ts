import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/validate-phase-1-3.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
})