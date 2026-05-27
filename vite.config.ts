import { defineConfig } from 'vite'
import typescript from '@rollup/plugin-typescript'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import * as path from 'path'
import pkg from './package.json'

// .d.ts emission is handled by the `tsc` step in `npm run build` (writes to
// dist/types/ via tsconfig.json#outDir). We don't use vite-plugin-dts here
// because it conflicts: it writes types alongside the JS bundle in dist/,
// while we want them grouped under dist/types/ so package.json#exports.types
// stays clean across both browser and Node entries.

const name = 'canvas-editor-pdf'

// Two build modes share this config:
//   `vite build --mode lib-browser` → dist/canvas-editor-pdf.{es,umd}.js
//                                     consumed via `import 'canvas-editor-pdf'`
//   `vite build --mode lib-node`    → dist/node/index.{es,cjs}.js
//                                     consumed via `import 'canvas-editor-pdf/node'`
//
// The two builds share src/ verbatim — the only difference is that the Node
// build aliases ./platform/current.ts → ./platform/node.ts via resolve.alias,
// so DrawPdf transparently sees the right runtime (DOM canvas vs @napi-rs/canvas).
//
// The Node build must NOT empty dist/, otherwise it would wipe the browser
// output that ran first via the build:browser script.
export default defineConfig(({ mode }) => {
  const isNode = mode === 'lib-node' || mode === 'lib-node-cjs'
  const isCjs = mode === 'lib-node-cjs'

  return {
    define: {
      __VERSION__: JSON.stringify(pkg.version)
    },
    plugins: [
      // CSS injection only matters for the browser build. The Node build
      // doesn't run in a DOM so any inline-style trick is pointless there.
      ...(isNode ? [] : [
        cssInjectedByJsPlugin({
          styleId: `${name}-style`,
          topExecutionPriority: true
        })
      ]),
      // Node-only: prepend a runtime-evaluated `__moduleUrl__` constant to the
      // bundle so platform/node.ts can resolve dist/font/ relative to wherever
      // the lib was installed. We do this in renderChunk (post-transform)
      // because Vite 2 statically rewrites any literal `import.meta.url` it
      // sees during the source transform pass — including string contents of
      // rollupOptions.output.intro. renderChunk runs after that pass, so the
      // text we inject reaches the output untouched.
      {
        ...typescript({
          tsconfig: './tsconfig.json',
          include: ['./src/**']
        }),
        apply: 'build',
        declaration: false,
        rootDir: '/'
      }
    ],
    resolve: isNode
      ? {
          // Swap the platform shim. DrawPdf.ts (and friends) import from
          // '../../platform/current' regardless of build target. This regex
          // catches that import path no matter how deeply nested the caller
          // is, and rewrites it to ./platform/node.ts — so the Node bundle
          // ships the @napi-rs/canvas shim instead of the DOM one.
          //
          // The array form is used (instead of the object form) because Vite
          // only supports regex aliases through the array shape.
          alias: [
            {
              // Match the whole import specifier (any depth of `../`) so the
              // full string is replaced, not just the tail. Vite's regex alias
              // uses .replace(), so matching only the tail would prepend the
              // unmatched leading `../../` to the absolute replacement path
              // and produce a broken request.
              find: /^.+\/platform\/current(\.ts)?$/,
              replacement: path.resolve(__dirname, 'src/platform/node.ts')
            }
          ]
        }
      : {},
    build: {
      // Critical: the Node build runs AFTER the browser build (see package.json
      // scripts). If emptyOutDir were true here, the Node build would wipe
      // dist/canvas-editor-pdf.{es,umd}.js and dist/font/ that just landed.
      emptyOutDir: !isNode,
      // The Node ESM and CJS builds run as separate Vite invocations rather
      // than in one pass (formats: ['es', 'cjs']) because Vite 2.x in lib
      // mode injects `const import_meta = {}` globally when both formats are
      // emitted together, breaking `import.meta.url` resolution we use in
      // src/platform/node.ts#getBundledFontPath. Splitting the builds lets
      // the ESM output keep real `import.meta.url` while the CJS output
      // uses Node's `__filename` (via the conditional below).
      lib: {
        formats: isNode
          ? [isCjs ? 'cjs' : 'es']
          : ['es', 'umd'],
        name: 'CanvasEditorPDF',
        fileName: format => isNode
          ? `node/index.${format === 'cjs' ? 'cjs' : 'es'}.js`
          : `${name}.${format}.js`,
        entry: isNode
          ? path.resolve(__dirname, 'src/node.ts')
          : path.resolve(__dirname, 'src/index.ts')
      },
      // Vite 5+: sourcemap moved out of rollupOptions.output to build.sourcemap.
      sourcemap: true,
      rollupOptions: {
        output: {
          globals: (id: string) => {
            if (id === 'jspdf') return 'jsPDF'
            if (id.startsWith('@hufe921/canvas-editor')) return 'Editor'
            return id
          }
        },
        external: isNode
          ? [
              // Peer deps the consumer installs themselves.
              /^@hufe921\/canvas-editor(\/|$)/,
              'jspdf',
              // Optional peer deps that only exist in Node deployments. Marked
              // external so Vite doesn't try to bundle the native module.
              '@napi-rs/canvas',
              '@resvg/resvg-js',
              // Node built-ins used by the platform shim. Including 'node:'
              // prefix and unprefixed names so both styles resolve correctly.
              'node:fs/promises',
              'node:path',
              'node:url',
              'fs/promises',
              'fs',
              'path',
              'url'
            ]
          : [/^@hufe921\/canvas-editor(\/|$)/, 'jspdf']
      }
    }
  }
})
