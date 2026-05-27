# canvas-editor-pdf

PDF exporter for [canvas-editor](https://github.com/Hufe921/canvas-editor).
Re-implements the editor's render pipeline against
[jsPDF](https://github.com/parallax/jsPDF)'s `Context2d` (a canvas-like API that
emits PDF instructions) instead of rendering to a real `HTMLCanvasElement`.

Tracks `@hufe921/canvas-editor` and is updated to stay in sync with upstream
changes.

## What's new in 0.4.0

- **Runs in Node.js** in addition to the browser. Same package, two entries:
  - `import { DrawPdf } from 'canvas-editor-pdf'` — browser (unchanged)
  - `import { DrawPdf } from 'canvas-editor-pdf/node'` — Node (new)
- Pluggable font source: `'cdn'`, `'bundled'`, or a custom directory.
- See the [CHANGELOG](./CHANGELOG.md) for the full list.

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
