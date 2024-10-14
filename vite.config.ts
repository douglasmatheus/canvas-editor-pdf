import { defineConfig } from 'vite'
import typescript from '@rollup/plugin-typescript'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import * as path from 'path'

export default defineConfig(({ mode }) => {
  const name = 'canvas-editor-pdf'
  if (mode === 'lib') {
    return {
      plugins: [
        cssInjectedByJsPlugin({
          styleId: `${name}-style`,
          topExecutionPriority: true
        }),
        {
          ...typescript({
            tsconfig: './tsconfig.json',
            include: ['./src/editor/**']
          }),
          apply: 'build',
          declaration: true,
          declarationDir: 'types/',
          rootDir: '/'
        }
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
            globals: {
              jspdf: 'jsPDF', // Defina jsPDF como global no UMD
              '@hufe921/canvas-editor': 'Editor', // Defina jsPDF como global no UMD
            },
          },
          external: ['@hufe921/canvas-editor', 'jspdf'],
        },
      }
    }
  }
  return {
    base: `/${name}/`,
    server: {
      host: '0.0.0.0'
    }
  }
})
