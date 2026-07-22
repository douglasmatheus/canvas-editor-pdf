# Changelog

## Unreleased

### Fixed
- LaTeX no longer hangs `setValue()` in the browser. The root cause was a
  browser-shim regression (0.4.0, Node-support refactor): `LaTexUtils.svg()`
  returns an already-wrapped `data:image/svg+xml;base64,…` URL, but
  `svgToPngDataUrl` wrapped it a second time — the resulting `<img>` never
  loaded and, with no `onerror` handler, the promise never resolved, stalling
  any awaited caller. LaTeX rendering no longer rasterizes at all (see below),
  so this path is gone; the shim was also hardened (uses an already-encoded
  data URL as-is, rejects on image load failure) for its remaining public use
  via `svgString2Image`.
- Nested ordered lists now number each level independently instead of running
  the count straight through. `getValue()` strips `listId` from a list's
  `valueList` items (only `listLevel` survives serialization), but
  `formatElementList` reused a single `listId` for the whole list, so nested
  items shared the parent's counter. It now assigns a distinct `listId` per
  `listLevel` on re-import (matching canvas-editor), so a child restarts at 1
  and the parent resumes afterward.
- `setValue()` no longer aborts early when a document has no header or footer.
  It used `return` instead of `continue` while iterating the header/main/footer
  zones, so a missing zone bailed out of the whole method before
  `setEditorData` ran, leaving the content unset.
- `new DrawPdf(editor.command.getValue().options, …)` and `updateOptions(...)`
  no longer raise a type error. canvas-editor's option types are a separate copy
  — and, when consumed from the editor's own source, a different module instance
  — so their enum-typed fields are nominally incompatible with this lib's and no
  type union can bridge them. The `options` parameter now accepts a loose object
  at the boundary (it is normalized by `mergeOption` anyway); pass this lib's
  `IEditorOption` for full autocomplete.

### Added
- Nested list rendering (aligned with canvas-editor): `element.listLevel` is now
  honored — nested markers and content indent per level, unordered bullets
  rotate by depth (disc → circle → square), and ordered-list numbering is
  tracked per `listId` so a parent list resumes its sequence after a nested
  child. (The editor-side indent/outdent commands were not ported — this
  library only renders.)

### Changed
- LaTeX formulas now render as **vector paths** drawn straight onto the jsPDF
  context, instead of being rasterized to a PNG and placed as an image. Output
  is crisp at any zoom, the PDF is smaller, and the render path is fully
  synchronous (no `Image`/SVG decoding — it can never stall an awaited caller).
  The formula's polylines come from `LaTexUtils`; stroke color follows the
  element's `color`. `svgString2Image`/`platform.svgToPngDataUrl` remain
  exported for back-compat but are no longer used internally.
- A row whose visible content is entirely hidden (`element.hide` /
  `control.hide` / `area.hide`) now collapses to zero height in any non-design
  render mode, so hidden content leaves no blank gap in the exported PDF.
  Empty/newline-only rows are unaffected. Previously this only happened in
  PRINT mode, gated behind `modeRule.print.filterHideElementRow`.

### Removed
- **Breaking:** the `modeRule.print.filterHideElementRow` option. Hidden-row
  collapsing is now unconditional in non-design modes (see above), so the flag
  no longer had any effect.

## 0.5.0 (2026-07-09)

### Added
- **Multi-column layout** via a new `column` option (`count`, `gap`,
  `separator`, `separatorColor`, `separatorWidth`). Content flows
  column-by-column and only spills to the next page once the last column
  fills; optional separator lines are drawn between columns. Ignored in
  `CONTINUITY` page mode.
- **Per-page header/footer control**: `disabledPages` (page numbers on which
  the header/footer is hidden) and `editable` on the header/footer options,
  plus `inactiveAlpha`. Pages with disabled chrome reclaim the vertical space.
- **Nested tables** — tables inside table cells now lay out, render and
  paginate correctly (cell/element/position resolved through a table path).
- **Areas inside table cells** — an area's background/border/placeholder is now
  honored when the area lives within a `td`, positioned to the cell content box.
- Control `minWidth` is now honored across line wraps (placeholder elements are
  inserted to fill the remaining width and restored before each relayout).
- `areaHideDisabled` print-mode rule.

### Fixed
- LaTeX elements clear their target rect before drawing, avoiding overdraw when
  a page is re-rendered.
- **Text watermark rendering.** The non-repeating watermark is now centered on
  the page (was anchored near the bottom-left and rendered off-center), and
  `repeat: true` now actually tiles the text across the page (the previous
  code relied on a canvas pattern fill that jsPDF's `Context2d` doesn't
  support, so a repeating watermark drew nothing). `gap` spacing applies to the
  tiled layout. Image watermarks are unaffected (still single, non-repeating).
- **Page number font.** The page-number renderer rewrote the font family
  `Microsoft YaHei` → `Yahei` before drawing, but fonts register with jsPDF
  under a lowercased id (e.g. `microsoft yahei`) and no `Yahei` exists, so CJK
  page numbers (e.g. `第{pageNo}页/共{pageCount}页`) fell back to a Latin font
  and rendered as garbage. Page numbers now resolve the font the same way body
  text does — lowercasing the family to match the registered id and calling
  `setFont` — and the text is measured with that font so centered/right
  alignment stays accurate.

## 0.4.2 (2026-05-27)

### Fixed
- Added a `typesVersions` map for the `./node` subpath so consumers on
  TypeScript < 5.0 (classic `moduleResolution: "node"`, which doesn't read the
  `exports` `types` condition) can still resolve types for
  `import { DrawPdf } from 'canvas-editor-pdf/node'`. Without it, those projects
  hit `TS2307: Cannot find module 'canvas-editor-pdf/node'`. Modern resolution
  (`bundler`/`node16`/`nodenext`) keeps using the `exports` map.

## 0.4.1 (2026-05-27)

### Fixed
- Widened the `@napi-rs/canvas` peer dependency range from `^0.1.0` to
  `^0.1.0 || ^1.0.0`. 0.4.0 only accepted the 0.1.x line, so installing
  alongside `@napi-rs/canvas@1.x` (the current major) failed with an
  `ERESOLVE` peer conflict. Verified the render pipeline works unchanged on
  `@napi-rs/canvas@1.0.0`.

## 0.4.0 (2026-05-27)

### Added
- **Node.js support** via subpath export `canvas-editor-pdf/node`.
  Browser consumers continue using `import { DrawPdf } from 'canvas-editor-pdf'`;
  Node consumers use `import { DrawPdf } from 'canvas-editor-pdf/node'`. Same
  public API surface in both environments.
- Internal `src/platform/` shim that swaps DOM canvas / `fetch` / `Image` for
  `@napi-rs/canvas` / `node:fs` / `@resvg/resvg-js` in the Node build (selected
  via a `vite.config.ts` `resolve.alias` regex). `DrawPdf`, `Watermark` and
  `ImageParticle` are the only call sites that import the shim.
- `fontSource` option on `DrawPdf` constructor (`'cdn' | 'bundled' | { dir }`).
  Default is `'bundled'` in Node (reads `dist/font/` from the installed package)
  and `'cdn'` in the browser (preserves pre-0.4.0 behavior).
- `@napi-rs/canvas` and `@resvg/resvg-js` declared as **optional peer deps** —
  browser consumers don't install them; Node consumers do.
- Node smoke test at [scripts/smoke/node/run.mjs](scripts/smoke/node/run.mjs)
  and a paired browser smoke at [scripts/smoke/browser/](scripts/smoke/browser/).
- Copy-pasteable consumer examples under [examples/](examples/) (Next.js Pages
  & App Router, Express, standalone script, browser client).
- README sections **Node usage**, **Fonts / fontSource**, and a short
  **Running on a server** note.

### Changed
- **TypeScript** bumped from 4.9 → 5.9 (`skipLibCheck` enabled in `tsconfig`
  to silence stricter type errors from `@napi-rs/canvas`'s declaration file
  which uses TS 5+ features).
- **Vite** bumped from 2.x → 5.x. Vite 5 preserves `import.meta.url` in lib
  mode natively, which let me drop the `generateBundle` workaround plugin
  the v0.4.0 prototype needed. `src/platform/node.ts#getBundledFontPath`
  now reads `import.meta.url` directly.
- **prismjs** bumped to `^1.30.0` (fixes CVE-2022-23647 — not on the PDF render
  path but worth patching while we're here).
- TypeScript output now lands in `dist/types/` (browser entry types at
  `dist/types/index.d.ts`, Node entry at `dist/types/node.d.ts`). `vite-plugin-dts`
  removed in favor of a single `tsc` step.
- `engines.node` raised to `>=18.0.0` (Node 18 has native `fetch` + stable
  `node:` imports — both required by the Node platform shim).
- `import jsPDF from 'jspdf'` switched to named `import { jsPDF } from 'jspdf'`
  for Node ESM compatibility (jsPDF's CJS default-export shape makes the
  default import resolve to the namespace object, not the class).
- `src/dataset/enum/{Common,Editor,Element}.ts` switched from re-exporting
  `@hufe921/canvas-editor`'s runtime enums to inlining them locally. Required
  because the Node ESM build can't introspect canvas-editor's CJS bundle.
- `DrawPdf.getPagePixelRatio` falls back to `1` when `window` is undefined
  (Node has no `window.devicePixelRatio`).
- `build.sourcemap: true` moved out of `rollupOptions.output` (deprecated in
  Vite 5+).

### Fixed
- `window.btoa` calls in `src/utils/index.ts` and
  `src/core/draw/particle/latex/utils/LaTexUtils.ts` swapped for the global
  `btoa` (available in Node 16+ and all browsers).
- `HyperlinkParticle`, `DateParticle`, `BlockParticle` constructors now skip
  their DOM popup/container setup when `typeof document === 'undefined'`. PDF
  render path never touches those nodes, so this is safe and unblocks the
  Node bundle.
- `Watermark` no longer assumes `temporaryCanvas.style` exists
  (`@napi-rs/canvas` has no DOM-style accessor).

### Removed
- `vite-plugin-dts` (`tsc` covers the same job and avoids dual-emission to
  `dist/` and `dist/types/`).
- `vitepress` and `vue` from devDependencies (unused — no docs site is built
  from this repo). Removes 15+ transitive vulnerable packages from the
  install tree.

## 0.3.2 (2026-05-22)

### Changed
- Upgraded **jspdf** 3.0.4 → 4.2.1. No public API changes affecting the lib's
  use of `Context2d`, `addImage`, `addPage` or font registration.

### Fixed
- **PDF size growth on repeated export.** Reusing a `DrawPdf` instance and
  calling `render()` + `save()` multiple times produced increasingly large
  PDFs (1st ~700 KB, 2nd+ ~2 MB when images were present). Root cause: jsPDF's
  `putImage` splices `"FlateEncode"` out of the *live* array returned by
  `getFilters()`, so after the first save with an image the filter array
  becomes `[]` and later saves emit page content uncompressed. Fix: recreate
  the jsPDF instance at the start of every `render()` so each export starts
  from a clean filter state; fonts are cached as base64 and reapplied
  synchronously (no CDN refetch). Constructor now delegates jsPDF init to
  `_resetPdf`.
  - ⚠️ **Breaking for some callers:** `getPdf()` must be called **after**
    `render()`, since the instance reference changes each render.

## 0.3.1 (2026-05-21)

### Fixed
- Build/type errors surfaced by the canvas-editor 0.9.133 sync. Build- and
  types-only, no behavior changes:
  - Replaced the `package.json` import in `DrawPdf` with a `__VERSION__` token
    injected via Vite `define` (the import escaped `tsconfig` `rootDir`).
  - Added `filterEmptyControl` / `filterHideElementRow` to the print-mode
    defaults (`IPrintModeRule` gained them upstream).
  - `Control.ts` now iterates `IEditorData` over `header`/`main`/`footer` only,
    skipping the new `graffiti` key whose value isn't `IElement[]`.
  - Lint cleanup (unused vars in `Badge.ts`, `BlockParticle.ts`).

## 0.3.0 (2026-05-21)

### Added
- **Sync with canvas-editor 0.9.133** (catch-up port from 0.9.94; peer dep
  bumped accordingly). Render-relevant changes only — editor APIs, event
  handlers, search, cursor and other interactive paths are intentionally not
  ported since this lib only produces PDF output. Highlights:
  - New element types: **AREA** (content block with background/border/
    placeholder + hide mode), **Badge** (page-level overlay), **Label**
    (inline label), **Graffiti** (freehand layer), and **image captions**
    (optional caption below images with `{imageNo}` token).
  - Render/layout fixes pulled from upstream: text ascent/descender handling,
    zero-width elements, punctuation/tab widths; list spacing and numbering;
    table colgroup/adaptive height/page-break rendering; surrounding-image
    scaling; area positioning; watermark layering and format tokens; print
    mode options.
  - `IElement` / `IEditorOption` gained the matching upstream fields
    (`hide`, `areaIndex`, `label`, `imgCaption`, `graffiti`, `badge`, …) and
    new enums/constants (Area, Label, Graffiti, FlexDirection, …).
- `AGENTS.md` with architecture and dev-workflow guidance.
- `dev` script for watch-mode library builds (`vite build --mode lib --watch`),
  for testing via `npm link` from a consumer without re-running build manually.

### Changed
- **`DrawPdf` accepts canvas-editor types directly** (constructor + `setValue`),
  removing the need for `JSON.parse(JSON.stringify(...))` at the consumer
  boundary. Options param widened `DeepRequired<IEditorOption>` → `IEditorOption`
  (defaults filled internally by `mergeOption`); data/payload widened to a union
  with canvas-editor's `IEditorData`.
- **`npm run build` now produces the library** (was `npm run lib`). Previously
  `build` produced the demo and could overwrite the library `dist/` by accident.
  The demo entrypoint and its scripts were inherited from upstream, never used,
  and have been removed entirely.
- Expose the types entry in `package.json#exports`.

### Fixed
- Infinite recursion when rendering `float-bottom` images.

## Earlier versions

See the git history for changes prior to 0.3.0.
