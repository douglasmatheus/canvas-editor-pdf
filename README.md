# canvas-editor-pdf

PDF exporter for [canvas-editor](https://github.com/Hufe921/canvas-editor).
Re-implements the editor's render pipeline against
[jsPDF](https://github.com/parallax/jsPDF)'s `Context2d` (a canvas-like API that
emits PDF instructions) instead of rendering to a real `HTMLCanvasElement`.

Tracks `@hufe921/canvas-editor` and is updated to stay in sync with upstream
changes.

**▶ Try it:** [live playground](https://douglasmatheus.github.io/canvas-editor-pdf/)
— paste a canvas-editor `options` object and `data` and preview the PDF in the
browser.

## What's new in 0.6.0

- **Table pagination reworked** — a table crossing a page boundary is split into
  per-page fragments at the render layer, so rows split mid-row, `pagingRepeat`
  header rows repeat on continuation pages, and `getValue()` no longer comes
  back with duplicated rows.
- **Nested lists** render with per-level indent, rotating bullets and
  independent numbering.
- **LaTeX formulas draw as vector paths** instead of a rasterized PNG — crisp at
  any zoom, smaller PDFs, and fully synchronous.
- Wide tables shrink to fit the content area (`table.overflow` now defaults to
  `false`) and fully hidden rows collapse to zero height in any non-design mode.
- Runs in both the browser and Node.js (`canvas-editor-pdf/node`), with a
  pluggable font source (`'cdn'` / `'bundled'` / custom directory).
- ⚠️ **Contains breaking changes** — `getValue()` now returns the data object
  directly, `table.overflow` flipped its default, and a dead-code cleanup
  dropped several unused `DrawPdf` methods. See the
  [CHANGELOG](./CHANGELOG.md#060-2026-08-01) for the migration notes and the
  full list.

---

## Install

### Browser

```bash
npm install canvas-editor-pdf
```

### Node

```bash
npm install canvas-editor-pdf @napi-rs/canvas @resvg/resvg-js
```

`@napi-rs/canvas` and `@resvg/resvg-js` are declared as **optional peer
dependencies**. Browser consumers don't need them; Node consumers must install
them explicitly. Requires Node 18+.

---

## Quickstart — browser

```js
import { DrawPdf } from 'canvas-editor-pdf'

// 1. Build an instance from canvas-editor's command.getValue() result.
const editor = /* your canvas-editor instance */
const { options, data } = editor.command.getValue()

const pdf = new DrawPdf(options, data, { loadDefaultFonts: true })

// 2. Wait for fonts (jsPDF loads them synchronously and can freeze the UI
//    if instantiated on a click handler — kick this off ahead of time).
await pdf.defaultFontsLoadedPromise

// 3. Render and trigger download.
pdf.render()
pdf.getPdf().save('document.pdf')
```

> **Tip:** instantiate `DrawPdf` early (e.g. when the editor mounts), not on
> the click that exports. jsPDF loads fonts synchronously and can lock the UI
> for a few hundred ms.

---

## Quickstart — Node

```js
import { writeFile } from 'node:fs/promises'
import { DrawPdf } from 'canvas-editor-pdf/node'

const pdf = new DrawPdf(editorOptions, editorData, {
  loadDefaultFonts: true
  // fontSource defaults to 'bundled' in Node — reads dist/font/ from the
  // installed package, no network access.
})
await pdf.defaultFontsLoadedPromise
pdf.render()

const buffer = Buffer.from(pdf.getPdf().output('arraybuffer'))
await writeFile('document.pdf', buffer)
```

### Where do `editorOptions` and `editorData` come from?

Straight from canvas-editor — `DrawPdf` (and `setValue`) accept
`@hufe921/canvas-editor`'s `IEditorOption` / `IEditorData` types directly, so
you can pass `editor.command.getValue()` without any conversion:

```js
const { options, data } = editor.command.getValue()
const pdf = new DrawPdf(options, data, { loadDefaultFonts: true })
```

(When you send the data to a backend over HTTP you'll serialize it to JSON
as part of the request body — that's normal transport, not a type workaround.)

### Full server examples

The [examples/](./examples/) folder has copy-pasteable code for:

- [`next-pages-router-api.ts`](./examples/next-pages-router-api.ts) — Next.js `pages/api/...` route
- [`next-app-router-api.ts`](./examples/next-app-router-api.ts) — Next.js `app/.../route.ts` (13.4+)
- [`nextjs-config-snippet.js`](./examples/nextjs-config-snippet.js) — the required `next.config.js` tweak
- [`express-server.mjs`](./examples/express-server.mjs) — Express server
- [`standalone-script.mjs`](./examples/standalone-script.mjs) — CLI / batch script
- [`browser-client.html`](./examples/browser-client.html) — frontend that POSTs to the backend and downloads

The [`examples/README.md`](./examples/README.md) covers common pitfalls
(bundler externals, CORS gotchas, `moduleResolution` for the subpath export).

---

## Fonts

`loadDefaultFonts` is **opt-in** (default `false`). When you pass `true`, the
library loads a curated set of fonts into jsPDF — and, in Node, also registers
them with `@napi-rs/canvas` so text measurement matches what jsPDF will draw.

```js
new DrawPdf(options, data, { loadDefaultFonts: true })
// or, after construction:
await instance.loadDefaultFonts()
```

### Bundled font set

- **Arial** (regular, bold, italic, bold-italic)
- **Calibri** (regular, bold, italic, bold-italic)
- **Cambria** (regular, bold, italic, bold-italic)
- **Verdana** (regular, bold, italic, bold-italic)
- **Segoe UI** (regular, bold, italic)
- **Microsoft YaHei** (regular, bold) — for CJK
- **Inkfree** (regular)

Plus the jsPDF built-ins (`courier`, `helvetica`, `times`, `symbol`).

### `fontSource` — where to load the TTFs from

The `fontSource` option controls which physical files back the default font
set. Defaults differ by environment:

| Value | Behavior | Default in |
|---|---|---|
| `'cdn'` | Fetch TTFs over https from `cdn.jsdelivr.net/npm/canvas-editor-pdf@0.2.7/dist/font/`. Available in both browser and Node. | Browser |
| `'bundled'` | Read TTFs from the package's own `dist/font/` directory (already installed in `node_modules`). Zero network. Node-only. | Node |
| `{ dir: '/abs/path' }` | Read TTFs from a directory you control. Must be an absolute path. | — |

```js
// Node, reading from a custom font directory you ship with your app:
new DrawPdf(opts, data, {
  loadDefaultFonts: true,
  fontSource: { dir: '/srv/app/fonts' }
})

// Node, keeping the CDN fetch behavior (e.g. for parity with browser):
new DrawPdf(opts, data, {
  loadDefaultFonts: true,
  fontSource: 'cdn'
})
```

### Adding extra fonts at runtime

```js
// instance.addFont(url, fileName, id, type)
await instance.addFont(
  'https://your-cdn.example.com/Roboto.ttf',
  'Roboto.ttf',
  'roboto',
  'normal'
)
```

In Node, the `url` argument may be either an http(s) URL or an absolute
filesystem path.

---

## Running on a server

When you render server-side, `DrawPdf` turns whatever `IEditorData` it's
given into a PDF — including large or malformed documents. The library doesn't
impose input limits or timeouts, so if you accept editor data from end users,
add your own guardrails (max payload size, a render timeout, and ideally a
worker/child process for untrusted multi-tenant input). Keep `@napi-rs/canvas`
and `@resvg/resvg-js` up to date since they're native modules.
