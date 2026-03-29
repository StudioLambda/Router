import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      reporters: ['tree'],
      setupFiles: './setupTests.ts',
      environment: 'happy-dom',
      coverage: {
        provider: 'v8',
        include: ['src/router/**/*.ts', 'src/react/**/*.{ts,tsx}'],
        exclude: [
          'src/react/index.ts',
          'src/router/index.ts',
          'src/react/example.tsx',
          'src/react/ExampleMain.tsx',
          'src/react/examples/**',
          'src/react/tsconfig.json',
          'src/router/tsconfig.json',
          '**/*.test.{ts,tsx}',
          '**/*.d.ts',
        ],
        reporter: ['text', 'lcov'],
      },
    },
  })
)
