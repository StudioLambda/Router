import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /router:(.*)/,
        replacement: fileURLToPath(new URL('./src/router/$1', import.meta.url)),
      },
      {
        find: /router\/react:(.*)/,
        replacement: fileURLToPath(new URL('./src/react/$1', import.meta.url)),
      },
    ],
  },
  build: {
    sourcemap: true,
    lib: {
      entry: {
        router: 'src/router/index.ts',
        router_react: 'src/react/index.ts',
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'],
    },
  },
  plugins: [
    react({
      include: ['src/react/**/*.tsx'],
    }),
    babel({
      include: ['src/react/**/*.tsx'],
      presets: [reactCompilerPreset()],
    }),
    dts({
      include: ['**/*.ts*'],
      exclude: ['**/*.test.ts*'],
      outDir: '../../dist',
      root: './src/router',
    }),
    dts({
      include: ['**/*.ts*'],
      exclude: ['**/*.test.ts*'],
      outDir: '../../dist',
      root: './src/react',
    }),
  ],
})
