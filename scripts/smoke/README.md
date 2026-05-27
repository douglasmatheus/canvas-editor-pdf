# Smoke tests

Manual smoke tests to validate that `canvas-editor-pdf` renders correctly in
both browser and Node after a build. Cypress (the project's existing test
infrastructure) is broken and only covered the original canvas-editor demo —
these scripts are what gates v0.4.0 until automated tests land.

The fixture in [fixtures/sample.js](fixtures/sample.js) exercises every code
path that changed in v0.4.0:

- Text in multiple weights / italics → `fakeCtx.measureText`
- CJK text → font registry on `@napi-rs/canvas` (Node) vs system font (browser)
- Inline PNG image → `ctx2d.drawImage`
- Table → `TableParticle` + `Position`
- Watermark with `repeat:true` → `platform.createCanvas` (Watermark.ts)
- LaTeX element → `platform.svgToPngDataUrl` (resvg-js in Node)
- Filler text long enough to force a page break → header/footer/page number pipeline

## Browser

From the project root:

```bash
npm run build
npx serve scripts/smoke/browser
# Open the printed http://localhost:3000 URL
# Click "Generate PDF" → downloads out-browser.pdf
```

Validation: open `out-browser.pdf` and check the page count, text, image,
table, watermark, and LaTeX formula all render.

## Node

From the project root:

```bash
npm run build
node scripts/smoke/node/run.mjs
# → writes scripts/smoke/out/out-node.pdf
```

Validation: open `scripts/smoke/out/out-node.pdf` and verify the same things
as the browser PDF. Compare them side by side — content and layout should
match (line breaks may differ by ≤1 character per line in CJK due to Skia vs
DOM-canvas metric differences; that's expected).

## Failure modes to watch for

- **Node script throws on `defaultFontsLoadedPromise`**: the `bundled` font
  resolver couldn't find `dist/font/*.ttf`. Re-run `npm run build`.
- **`@napi-rs/canvas` install fails on your platform**: it ships prebuilt
  binaries; check that your OS/arch is supported. If not, fall back to
  `fontSource: 'cdn'` (still works in Node but pulls TTFs over https).
- **Browser PDF renders but Node PDF is empty / corrupt**: the platform alias
  in `vite.config.ts` didn't fire — confirm `dist/node/index.es.js` references
  `@napi-rs/canvas` (`grep -c @napi-rs dist/node/index.es.js` should be ≥ 1).
- **LaTeX renders in browser but not Node**: `@resvg/resvg-js` failed silently
  on the SVG. Add a `console.log` inside `src/platform/node.ts#svgToPngDataUrl`
  and re-run.
