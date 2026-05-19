import { defineConfig } from 'vite'
import typescript from '@rollup/plugin-typescript'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import * as path from 'path'
import dts from 'vite-plugin-dts'

const name = 'canvas-editor-pdf'

export default defineConfig({
  plugins: [
    cssInjectedByJsPlugin({
      styleId: `${name}-style`,
      topExecutionPriority: true
    }),
    {
      ...typescript({
        tsconfig: './tsconfig.json',
        include: ['./src/**']
      }),
      apply: 'build',
      declaration: true,
      declarationDir: 'types/',
      rootDir: '/'
    },
    dts({
      insertTypesEntry: true,
    })
  ],
  build: {
    lib: {
      formats: ['es', 'umd'],
      name: 'CanvasEditorPDF',
      fileName: (format) => `${name}.${format}.js`,
      entry: path.resolve(__dirname, 'src/index.ts'),
    },
    rollupOptions: {
      output: {
        sourcemap: true,
        globals: (id: string) => {
          if (id === 'jspdf') return 'jsPDF'
          if (id.startsWith('@hufe921/canvas-editor')) return 'Editor'
          return id
        },
      },
      external: [/^@hufe921\/canvas-editor(\/|$)/, 'jspdf'],
    },
  }
})
