# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Codex, etc.) working with this repository.

## What this project is

`canvas-editor-pdf` is a PDF exporter for [@hufe921/canvas-editor](https://github.com/Hufe921/canvas-editor). It re-implements the editor's rendering pipeline against [jsPDF](https://github.com/parallax/jsPDF)'s `Context2d` (a canvas-like API that emits PDF instructions) instead of an `HTMLCanvasElement`.

The library is published to npm as `canvas-editor-pdf`. `@hufe921/canvas-editor` is a peer dependency — consumers install both. There is no demo / playground — this is a library-only project.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | `vite build --mode lib-browser --watch` → rebuilds the browser bundle in `dist/` on every save. Use this when testing the library via `npm link` from a consumer. |
| `npm run build` | Full build: lint → browser bundle → Node ESM bundle → Node CJS bundle → `tsc` (types in `dist/types/`). |
| `npm run build:browser` | `vite build --mode lib-browser` → `dist/canvas-editor-pdf.{es,umd}.js` |
| `npm run build:node:esm` | `vite build --mode lib-node` → `dist/node/index.es.js` |
| `npm run build:node:cjs` | `vite build --mode lib-node-cjs` → `dist/node/index.cjs.js` |
| `npm run build:types` | `tsc -p tsconfig.json` → `.d.ts` files in `dist/types/` |
| `npm run lint` | ESLint over the repo |
| `npm test` | Vitest suite (`tests/`) — runs against `src/` under Node, no build needed. |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run type:check` | `tsc --noEmit` type check (no output emitted). |
| `node scripts/smoke/node/run.mjs` | Manual Node smoke test (renders the shared fixture to `scripts/smoke/out/out-node.pdf`). Requires a prior `npm run build`. |
| `npx serve scripts/smoke/browser` | Serve the browser smoke test page (open in browser, click "Generate PDF"). |

## Testing

Automated tests run under **Vitest** (`npm test`). They hit `src/` directly
under Node — no build required — because [vitest.config.ts](vitest.config.ts)
mirrors the two things the Node lib build does: it aliases `./platform/current`
→ `./platform/node.ts` (so there's no DOM dependency) and defines `__VERSION__`.
Fast iteration lives here; the built bundles are validated separately by the
smoke scripts below.

Cypress was removed — it was inherited from upstream canvas-editor and only
made sense for driving the editor's interactive demo UI, which this library
doesn't have. A PDF exporter is tested by asserting on its output, not by
clicking a browser.

Current suites:

1. **PDF output assertions** → [tests/integration/](tests/integration/). Render
   the shared `sample` fixture and assert with `pdfjs-dist` on extracted text
   per page (deterministic), page count, per-page header/footer, and embedded
   image operators. This is the layer that catches layout/pagination
   regressions (multi-column, per-page header/footer, tables).
2. **Platform shim units** → [tests/platform/](tests/platform/). Exercise the
   Node shim (`@napi-rs/canvas` + `@resvg/resvg-js`): `measureText`, `createCanvas`
   sizing, `getBundledFontPath`, path validation, and `svgToPngDataUrl`. The
   browser shim isn't unit-tested — a fake DOM has no real canvas metrics, so
   the browser path is covered end-to-end by the browser smoke script instead.

The fixture in [scripts/smoke/fixtures/sample.js](scripts/smoke/fixtures/sample.js)
is the single canonical example, shared by the smoke scripts and the Vitest
integration test (and slated to become the default input for the future demo
page). Keep it representative when adding features.

Roadmap (not yet built), cheapest first:

3. **Visual diff with tolerance** (advanced). Rasterize each PDF page to PNG
   (`pdfjs-dist` or `@napi-rs/canvas`) and compare against a baseline with
   `pixelmatch` at a threshold (~5%). Save diffs for human inspection. → `tests/visual/`
4. **Property-based fuzzing** (bonus). `fast-check` to generate random
   `IEditorData` and assert `render()` never throws.

## Reducing published font size

`public/font/` ships full TTFs; `msyh.ttf` / `msyh-bold.ttf` (CJK) alone are
~35 MB of the ~42 MB package. [scripts/subset-fonts.md](scripts/subset-fonts.md)
documents how to subset them with `pyftsubset` before a release. It's optional
and **not** wired into `npm run build`.

## Consumer-facing examples

[examples/](examples/) holds copy-pasteable code snippets for the most common
consumer scenarios (Next.js Pages Router, Next.js App Router, Express,
standalone Node script, browser frontend). When the public API changes —
constructor signature, `fontSource` option, peer deps — update those files so
README links don't drift out of sync.

Release flow: `scripts/release.js` validates `dist/` exists, strips `dependencies` from `package.json`, runs `npm publish`, then restores `package.json`.

## Big-picture architecture

### Entry point is dual-purpose

[src/index.ts](src/index.ts) is **both** the library entry (`vite.config.ts` mode `lib`) and the demo script (`index.html` references `/src/index.ts`). It exports `DrawPdf` and the `svgString2Image` helper plus a couple of types.

### `DrawPdf` is the whole library

[src/core/draw/DrawPdf.ts](src/core/draw/DrawPdf.ts) is the orchestrator. The consumer flow is:

```js
const instance = new DrawPdf(options, data, { loadDefaultFonts: true })
await instance.setValue(data)   // optional, async because LaTeX SVG→PNG
instance.render()                // builds the jsPDF document in memory
instance.getPdf().save('x.pdf')  // download
```

`DrawPdf` instantiates and wires together:

- **Frames** ([src/core/draw/frame/](src/core/draw/frame/)) — full-page chrome drawn per page: `Background`, `Margin`, `Header`, `Footer`, `PageNumber`, `LineNumber`, `Watermark`, `PageBorder`, `Placeholder`.
- **Particles** ([src/core/draw/particle/](src/core/draw/particle/)) — individual element renderers: `TextParticle`, `ImageParticle`, `Checkbox`, `Radio`, `Hyperlink`, `ListParticle`, `Separator`, `Subscript`, `Superscript`, `LineBreak`, plus subfolders for `block/`, `date/`, `latex/`, `previewer/`, `table/`.
- **Rich text decorators** ([src/core/draw/richtext/](src/core/draw/richtext/)) — `Highlight`, `Underline`, `Strikeout` (extend `AbstractRichText`).
- **Position** ([src/core/position/Position.ts](src/core/position/Position.ts)) — computes element/row coordinates.

### Render pipeline (per page)

`DrawPdf.render()` → computes row/page layout → `_immediateRender()` → loops pages → `_drawPage(pageNo)`:

1. `background.render` — page background color/image
2. `margin.render` — visible margin (skipped in `PRINT` mode)
3. `_drawFloat({ imgDisplays: [FLOAT_BOTTOM] })` — float images behind text
4. `drawRow(...)` — main content (text + inline particles + tables + etc.)
5. Paging mode only: header, page number, footer
6. `_drawFloat({ imgDisplays: [FLOAT_TOP, SURROUND] })` — float images in front of text
7. Watermark, placeholder (if empty), line numbers, page border

The order is what guarantees correct layering. **A particle's `render()` should NOT call back into `this.draw.render()`** — that causes infinite recursion (this was bug fixed in 2026-05 for `FLOAT_BOTTOM` images).

### Platform shim (browser vs Node)

[src/platform/](src/platform/) abstracts the few environment-specific APIs the renderer needs (DOM canvas for `measureText`, `fetch`/`fs` for fonts, `Image`/`@resvg/resvg-js` for SVG→PNG):

- [types.ts](src/platform/types.ts) — the `IPlatform` interface.
- [browser.ts](src/platform/browser.ts) — DOM canvas + `fetch` + `Image`.
- [node.ts](src/platform/node.ts) — `@napi-rs/canvas` + `node:fs/promises` + `@resvg/resvg-js`.
- [current.ts](src/platform/current.ts) — defaults to re-exporting `browser`. The Node build (`vite --mode lib-node`/`lib-node-cjs`) swaps it for `node` via a regex `resolve.alias` (`^.+/platform/current(\.ts)?$` → `src/platform/node.ts`).

`DrawPdf`, `Watermark`, and `ImageParticle` import only from `./platform/current`. Don't import `./platform/browser` or `./platform/node` directly — that would lock the call site to one runtime.

[src/node.ts](src/node.ts) is a second entry point used only by the Node build (`canvas-editor-pdf/node`). It re-exports the same symbols as `src/index.ts`.

`src/platform/node.ts#getBundledFontPath` resolves `dist/font/<file>` via `new URL('../font/' + fileName, import.meta.url)` + `fileURLToPath()`. Vite 5+ preserves `import.meta.url` in lib mode for ESM and emits a runtime polyfill for CJS, so the same source line works in both bundles.

> Historical note: pre-v0.4.0 (when this repo was still on Vite 2), `import.meta` was statically stubbed away in lib mode. The original workaround used a `generateBundle` hook to re-inject a `__moduleUrl__` constant after Vite's rewrite. The Vite 5 upgrade removed the need for that plugin — see git history if you're chasing a regression.

### Most of `src/core/` is dead-weight scaffolding

The folders `actuator/`, `cursor/`, `event/`, `history/`, `i18n/`, `listener/`, `observer/`, `override/`, `plugin/`, `range/`, `register/`, `shortcut/`, `worker/`, `zone/` mirror the canvas-editor layout but are mostly **not used** by `DrawPdf`. They exist so the diff against upstream stays readable when porting fixes. Don't expect them to do anything — wire-up lives in `DrawPdf` constructor.

[src/editor/](src/editor/) is similarly vestigial — only `editor/core/draw/control/Control.ts` survives.

### Types and enums are duplicated from canvas-editor

[src/interface/](src/interface/) and [src/dataset/enum/](src/dataset/enum/) are **copies** of canvas-editor's types/enums, not re-exports. This is intentional (lets the library evolve independently) but causes friction at the consumer boundary: `IElement` here ≠ `IElement` from `@hufe921/canvas-editor`. Consumers typically `JSON.parse(JSON.stringify(editor.command.getValue().data))` to cross the boundary — that's a known wart, not a bug.

Pre-0.4.0, three enum files ([Common.ts](src/dataset/enum/Common.ts), [Editor.ts](src/dataset/enum/Editor.ts), [Element.ts](src/dataset/enum/Element.ts)) were **re-exports** rather than copies. That broke the Node ESM build because canvas-editor publishes as CJS and Node's ESM-CJS interop can't analyze named exports. As of 0.4.0 those files are local copies too — keep them in sync with upstream enum values if you ever pull updates.

## Gotchas for editing

- **jsPDF loads fonts synchronously** — instantiating with many fonts can freeze the UI. As of v0.2.12, default fonts are **opt-in** via `{ loadDefaultFonts: true }` in the constructor (or `instance.loadDefaultFonts()` later). Don't add font loading to the constructor's hot path.
- **jsPDF doesn't support SVG** — LaTeX elements (`element.laTexSVG`) must be pre-converted to PNG via the exported `svgString2Image(svgString, w, h, 'png', cb)` helper before `render()`. See README for the consumer-side pattern.
- **Build externals** — `vite.config.ts` externalizes `@hufe921/canvas-editor` and `jspdf` in `lib` mode. Don't import from those expecting them to be bundled.
- **Code style** — ESLint enforces `semi: never` (no trailing semicolons) and single quotes. Prettier: 80 col, no trailing comma, `arrowParens: 'avoid'`, LF line endings.
- **TS** — `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `emitDeclarationOnly: true` (vite handles the JS output, tsc only emits `.d.ts`).

## Where to start when…

- **Bug in PDF output for a specific element type** → find the matching `*Particle.ts` under [src/core/draw/particle/](src/core/draw/particle/) and check its `render()`.
- **Page chrome bug (header/footer/margin/etc.)** → [src/core/draw/frame/](src/core/draw/frame/).
- **Wrong layout / element positioning** → [src/core/position/Position.ts](src/core/position/Position.ts) + `computeRowList` / `_computePageList` in `DrawPdf`.
- **Adding a feature that upstream canvas-editor already has** → diff against the upstream file (paths mirror exactly) and port the changes; the `// 中文` comments are a hint that the line came from upstream.
