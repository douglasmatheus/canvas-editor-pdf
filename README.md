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

### canvas-editor versions

The `@hufe921/canvas-editor` peer range is `>=0.9.133 <2.0.0` — every 0.9.x
from 0.9.133 and the whole 1.x line, including 1.0.3. Pick whichever version
your editor runs; you do not have to match the one this library was built
against.

It is also an **optional** peer. The coupling is a **data format, not an API** —
nothing here imports `@hufe921/canvas-editor` at runtime or in the published
types — so a server that receives stored JSON and returns a PDF never has to
install the editor at all. Browser consumers already have it, and when it is
present the range above is enforced normally. `src/interface/` and `src/dataset/enum/` are copies of the editor's
types, so the only contract is the shape of the `options` / `data` you hand to
`DrawPdf`. Fields this library doesn't know about are ignored, which is what
makes a newer editor safe to pair with an older exporter.

Those copies are kept identical to upstream's, which is what lets you pass
`editor.command.getValue()` straight through with no cast and no clone.
A type-level check in the fork's own build
([tests/types/consumer-boundary.ts](./tests/types/consumer-boundary.ts))
compiles that exact consumer snippet on every `npm run type:check`, so a
divergence fails here rather than in your project.

The upper bound stops at the next major on purpose — a canvas-editor 2.0 could
reshape the document model, and that has to be reviewed before it is claimed
as supported. Until then, `>=0.9.133 <2.0.0` never blocks an install.

Which upstream version the render pipeline is actually aligned with is tracked
in [UPSTREAM.md](./UPSTREAM.md).

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

## What doesn't render: video and iframe blocks

canvas-editor's `block` elements — `video` and `iframe` embeds — come out of
the PDF blank. They aren't dropped or broken; there is simply nothing to draw.

The editor snapshots a video by handing a live `<video>` element to
`drawImage`, and the browser decodes the current frame for the canvas. jsPDF's
`Context2d` isn't a canvas: it takes an image that already exists, as a data
URL. An `iframe` is further out of reach — photographing an arbitrary web page
needs a headless browser.

If you need the video's frame in the PDF, put it there yourself: replace the
block element with an ordinary `image` element before handing the data to
`DrawPdf`. This is the same "convert first, then render" shape the library
uses for SVG through `svgString2Image`.

```js
// Browser — capture a frame as a PNG data URL, with its intrinsic size
async function captureVideoFrame(src, seconds = 0) {
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous' // the host must send CORS headers,
  video.muted = true              // or the canvas is tainted and toDataURL throws
  video.src = src
  await new Promise((ok, fail) => {
    video.onloadeddata = ok
    video.onerror = fail
  })
  video.currentTime = seconds
  await new Promise(ok => (video.onseeked = ok))
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: video.videoWidth,
    height: video.videoHeight
  }
}

// Swap the block for an image the exporter can draw
for (const element of data.main) {
  if (element.type === 'block' && element.block?.type === 'video') {
    const frame = await captureVideoFrame(element.block.videoBlock.src)
    element.type = 'image'
    element.value = frame.dataUrl
    // A block may carry no width — layout gives it the full column. An image
    // needs both, so fall back to the frame's own size.
    element.width = element.width || frame.width
    element.height = element.height || frame.height
    delete element.block
  }
}
```

Capturing in the browser, while the document is being edited, and storing the
data URL with it is usually the cheapest route: your server then never needs to
decode video at all. Extracting the frame server-side works too, but nothing in
Node decodes video — that means shelling out to `ffmpeg` or an equivalent, which
is why this library doesn't do it for you. A poster image or the thumbnail your
video host already provides is often enough.

---

## Running on a server

When you render server-side, `DrawPdf` turns whatever `IEditorData` it's
given into a PDF — including large or malformed documents. The library doesn't
impose input limits or timeouts, so if you accept editor data from end users,
add your own guardrails (max payload size, a render timeout, and ideally a
worker/child process for untrusted multi-tenant input). Keep `@napi-rs/canvas`
and `@resvg/resvg-js` up to date since they're native modules.
