# Upstream sync

This library is a fork of [@hufe921/canvas-editor](https://github.com/Hufe921/canvas-editor)'s
rendering pipeline. Only changes that affect **what ends up in the PDF** are
ported — the rest of the editor (cursor, selection, events, controls, menus,
toolbar chrome) does not exist here and never will.

Update this file whenever you review upstream, even if nothing was ported.
Knowing a commit was *reviewed and skipped* is as useful as knowing it was
ported.

> **Maintaining this file.** Each section has its own lifecycle:
>
> - **Last check** — a snapshot. *Overwrite* it every review, so there is
>   exactly one "where we are now".
> - **Review log** — *prepend* one block per review. Every commit in the
>   window gets exactly one disposition: **Ported**, **Not ported** or
>   **Ignored**. A ported commit may carry two optional sub-items —
>   *Left out* (part of it did not come) and *Adapted* (it came, but had to
>   change shape to fit this fork). Write them **only when there is
>   something to say**: a clean port stays a single line. Skip the routine
>   renames from *How to port* — they apply to every port and are noise here.
> - **Subsystems this fork does not have** — a standing list, indexed by
>   subsystem rather than by commit so it does not grow with upstream's
>   history. Touch it only when upstream adds a whole new subsystem, or when
>   a decision genuinely changes (and say so in the commit message).
>
> If the log ever gets long, delete the oldest blocks — they stay in this
> file's own git history.

## Last check

| | |
|---|---|
| Date | 2026-11-14 |
| Reviewed through | `5a1810ed` — *fix(search): preserve regex semantics when ignoring case #1519* (`origin/main`) |
| Upstream version | 1.2.0 (+ unreleased commits) |

## Review log

Newest first. The window in each heading is exhaustive — run
`git -C <upstream> log --oneline <window>` to check every commit is accounted
for below.

### 2026-11-14 — reviewed `9c4cfae7..origin/main` (3 commits)

No release; npm still has 1.2.0, so `devDependencies` stays at `^1.2.0`.

**Ported**

- `c356503c` — keep footnote rows that exactly fit the page bottom #1521.
  Our fix, already carried since the 2026-11-13 sync (see below); the merged
  `Footnote.ts` hunk is identical to the fork's, so nothing changed here.

**Not ported**

- `5a1810ed` — search regex semantics when ignoring case #1519. `Search`.

**Ignored** — no bearing on this library

- `3b65fc5c` (dev-dependency bumps).

### 2026-11-13 — reviewed `948e6ac5..9c4cfae7` (18 commits)

Upstream released **1.1.0** and **1.2.0** in this window. `devDependencies`
bumped to `@hufe921/canvas-editor@^1.2.0`; the consumer-boundary check passes
with the new `ElementType.FOOTNOTE`.

Each commit was ported on its own and checked against every PDF the suite
already wrote (77, `/CreationDate` and `/ID` stripped): all byte-identical
after every step, so none of the existing fixtures exercises the changed
paths. The new behaviour is covered by the tests named below, each confirmed
to fail on the pre-sync code.

**Ported**

- `4be9e292` — paragraph indent rework #725 #1190 #1459. The
  `getFirstLineIndentElement` move to `utils/element.ts`, the `LayoutEngine`
  hunk, and the `Position` hunk that counts `indentRight` in centre/right
  alignment. Covered by the alignment case in
  [tests/integration/paragraph-indent.test.ts](tests/integration/paragraph-indent.test.ts).
  - *Left out:* `Ruler` indent markers, the `tab` keydown handler, the
    `ruler.render()` call.
- `1865c9b0` — paragraph tab stops with leaders #256. `dataset/enum/TabStop.ts`,
  `ITabStop` / `IElementStyle.tabStops`, `IRowElement.tabLeader`, the
  attribute lists, the `LayoutEngine` tab width with `_getHitTabStop` /
  `_getTabRunWidth`, `TextParticle.renderTabLeader` and its `drawRow` call.
  **Changes output**: a tab with no stop now steps to the default grid
  instead of always being `defaultTabWidth` wide — see CHANGELOG. Covered by
  [tests/integration/tab-stop.test.ts](tests/integration/tab-stop.test.ts).
  - *Adapted:* `_getTabRunWidth` takes jsPDF's `Context2d` (the layout
    context here) instead of a `CanvasRenderingContext2D`.
  - *Left out:* `Ruler` tab marks, `Command`/`CommandAdapt`, `RangeManager`,
    `IRangeStyle`, `src/editor/index.ts` exports.
- `68f1a417` — line-end punctuation hanging #692. `HANG_PUNCTUATION_LIST`,
  `options.hangPunctuation` (default `false`), `IRowElement.hang`, the
  `LayoutEngine` hunks. Covered by
  [tests/integration/hang-punctuation.test.ts](tests/integration/hang-punctuation.test.ts).
  - *Left out:* the `IncrementalRowComputer` line.
- `7c4e8e66` — no word splitting around surround images #1200. `curWordWidth`
  in `LayoutEngine` and the `Position` width check. Covered by
  [tests/integration/surround-word-wrap.test.ts](tests/integration/surround-word-wrap.test.ts)
  (its own layout: upstream's test relies on mocked text metrics).
- `1724daad` — large-document rendering, layout parts only:
  `getInnerWidth` / `getPageSize` keep the unrounded width, `WIDTH_EPSILON`
  in the wrap test, `getInnerWidth(direction)` on a section change, and the
  `scale` parameter on `ListParticle.computeListStyle` / `getListStyleWidth`
  (nothing passes it here; kept for diffability).
  - *Left out:* `ScaledRowComputer`, the incremental-layout changes, the
    per-page position reuse in `Position.computePositionList`,
    `ElementListSnapshot` / history, lazy rendering and deferred canvas
    resizing.
- `6042a141` — footnotes #747. `ElementType.FOOTNOTE`, `IFootnoteElement`,
  `interface/Footnote.ts`, `dataset/constant/Footnote.ts`, `options.footnote`,
  `footnoteId` in the zip attributes, the `formatElementList` /
  `zipElementList` branches, every `LayoutEngine` hunk (reference numbering,
  superscript metrics, the reserved height in both page splits), and in
  `DrawPdf`: `getFootnote`, `isMainElementList`, the second layout pass when
  a page holds notes, the reference drawn as a superscript, and
  `footnote.render` in `_drawPage`. [src/core/draw/interactive/Footnote.ts](src/core/draw/interactive/Footnote.ts)
  is the layout and painting half of upstream's file. Covered by
  [tests/integration/footnote.test.ts](tests/integration/footnote.test.ts).
  - *Adapted:* the number is measured on `draw.getCtx2d()` (upstream makes a
    throwaway DOM canvas); `getElementFont` is `getFont`; the trace-hidden
    check in `computeReference` is dropped, like the other trace checks in
    `LayoutEngine`; `drawRow` gets no `keyContext` / `isDrawRange`.
  - *Also taken:* our fix #1521 (*fix: keep footnote rows that exactly fit
    the page bottom*), found while porting and sent upstream; merged as
    `c356503c` on 2026-11-14. `compute()` cut a
    note's visible rows with `visibleHeight + rowHeight > remainingHeight`,
    and the running difference of fractional row heights made a note that
    exactly fits compare a hair taller (22.333…6 against 22.333…3 with the
    default fonts), so the page's last note vanished. `HEIGHT_EPSILON` is
    copied from the PR; the exact-fit case in the test fails without it.
  - *Left out:* the editing half of `Footnote` (`insertFootnote`,
    `setFootnoteValue`, `getFootnoteValue`, `locationFootnote`, the
    position-context getters) and every caller of it: `Command` /
    `CommandAdapt`, events, `Position` hit-testing, the footnote branches of
    `getRowList` / `getElementList` / `getMainElementList`, the catalog
    worker, `IncrementalRowComputer`.

**Not ported**

- `516f1a43` — incremental layout promoted and on by default
  (`options.incrementalCompute`). The fork has no incremental layout
  (`ffa18f9c`); the option was not added.
- `8c3ac291` — paragraph drag #621. A hover handle and drag-to-move; see the
  subsystem list.
- `bcb0ecc3` — multi-page view layout #1270 (`pageLayout`,
  `PageLayoutManager`). Arranges page canvases side by side on screen; see
  the subsystem list. `PageLayout` and the option were not copied.
- `bda7144d` — `getRangeRects` command. Selection geometry for overlays.
- `7cfc3f4e` — print blocked by browser extensions. `utils/print.ts`.
- `73ad2fa8` — context menu placement #1514.

**Ignored** — no bearing on this library

- `2c6aa439`, `9c4cfae7` (releases), `47f6f297`, `5e9f6e49` (dev-dependency
  bumps), `d2aaf574` (upstream lint/tests), `38ace638` (README).

### 2026-10-30 — reviewed `d41e03ef..origin/main` (8 commits)

No release; npm still has 1.0.6, so `devDependencies` stays at `^1.0.6`.
The window holds one large architectural commit (`cf51314a`), which moves
code more than it changes it, and one layout feature (`948e6ac5`). Diffing
the moved layout code also surfaced four older hunks that had never come
over; they are listed under *Catch-up* below.

How the pure moves were checked: every PDF the test suite writes (55), plus
a stress document exercising every particle under 8 option sets, rendered
from the pre-sync `HEAD` and from the working tree, compared byte for byte
(`/CreationDate` and `/ID` stripped; output is otherwise deterministic).
Identical after the `LayoutEngine` move and after the render-layer move.

**Ported**

- `cf51314a` — SVG rendering backend #374, in four parts:
  - **Layout move** — [src/core/layout/LayoutEngine.ts](src/core/layout/LayoutEngine.ts).
    `computeRowList` / `computePageList` left `DrawPdf` as they left `Draw`;
    `DrawPdf.computeRowList` / `_computePageList` are the same thin wrappers
    (the continuous-mode page resize stays in the latter). Built from the
    fork's bodies with upstream's accessor rewrites applied, so diffing the
    two `LayoutEngine.ts` files shows only the fork's standing adaptations.
    New `DrawPdf` accessors: `isWordLike`, `getTablePaging`.
    - *Adapted:* `ctx` (a throwaway DOM canvas upstream) is `ctx2d =
      draw.getCtx2d()`; `getElementFont` stays `getFont`.
    - *Left out:* the incremental-layout plumbing (`payload.resume`, row
      snapshots, `isElementListTruncated`, `isMainElementList`,
      `getIsControlMinWidthPlaceholder`) — `ffa18f9c` was never ported.
  - **Render layer** — [src/core/render/](src/core/render/). `model/RenderContext.ts`
    and `model/DisplayList.ts` are copies; `RenderBackend.ts` keeps only
    `renderPage`; `pdf/PdfBackend.ts` + `pdf/PdfRenderer.ts` stand where
    `canvas/CanvasBackend.ts` + `CanvasRenderer.ts` are, replaying a page's
    list onto jsPDF. `_drawPage` records into a `DisplayList` and hands it to
    the backend, as upstream's does. Every particle, frame and decorator takes
    `ctx2d: IRenderContext` instead of jsPDF's `Context2d`; `drawRow` now
    passes its `ctx2d` on instead of reaching for `getCtx2d()`.
    - *Adapted:* the fork's direct jsPDF calls from particles (`setFont`,
      `setGState`, `setCharSpace`, `addImage`) and jsPDF's `clearRect` are
      recorded operations on `IRenderContext` / `DisplayList`, so they replay
      in order with the drawing around them. `DisplayList` also tracks `font`
      (TextParticle reads `ctx.font`). `drawImage` accepts a string source.
      The no-op `ctx2d.createPattern()` in `Watermark` is commented out.
      `RenderBackend` also keeps `resizeHeight`: the continuous-mode branch
      of `_computePageList` grows page 0 through it, and `PdfBackend` sets
      the jsPDF page height. (The pre-sync code still resized a `<canvas>`
      page that does not exist here, so continuity mode crashed.)
    - *Left out:* SVG scene keys (`beginGroup`/`endGroup`,
      `fillTextWithSource`, pattern resource identities, `keyContext` on
      `IDrawRowPayload`), `BackendFactory`, the canvas/SVG backends and
      surfaces.
  - **TextMeasurer** — [src/core/layout/TextMeasurer.ts](src/core/layout/TextMeasurer.ts),
    and the call sites upstream moved onto it: `TextParticle.measureText` /
    `measureBasisWord`, the `drawRow` strikeout baseline, `PageNumber`,
    `Watermark`, `ImageParticle` caption, `ListParticle`, `PageBreak`,
    `LineNumber`. **Changes output** — see CHANGELOG: list numbers, the
    page-break label and image captions used to be measured in the
    measuring canvas's own `10px sans-serif`, and basis metrics always in the
    default size. Covered by [tests/integration/text-metrics.test.ts](tests/integration/text-metrics.test.ts).
    - *Adapted:* `setCanvasFont` — a browser canvas ignores an invalid font
      string, `@napi-rs/canvas` throws. Upstream's callers rely on the
      browser behaviour (`measureBasisWord(ctx, element.font!)` passes a bare
      family). And because `ctx2d` can't measure, `TextParticle` carries
      `ctx2d.font` over to the platform canvas before measuring. The
      constructor's canvas comes from `platform.createMeasurementCanvas()`.
      `TextParticle` still measures `\n` as an empty string.
  - **Type parity** — `BackendType` (`dataset/enum/Editor.ts`),
    `IEditorOption.backend` and its `BackendType.CANVAS` default. Nothing
    reads `backend` here.
  - *Left out:* `ImageParticle`, `LaTexParticle`, `Badge` and `VideoBlock`
    no longer paint on async load upstream; they record pending loads and
    call `draw.render()` again. This fork draws images synchronously through
    jsPDF and must never re-enter `render()` from a particle (see AGENTS.md).
    Also the `getPagePointer` event helper, `Graffiti`/`Magnifier`/`Ruler`/
    `ZoneTip`/`HintParticle` pointer changes, `print.ts`, `Command`
    (`setBackend`, `getSvgPageList`).
- `948e6ac5` — paragraph indent and tab hanging indent #725 #1190.
  `indentLeft` / `indentRight` / `indentFirstLine` on `IElementStyle`, the
  three attribute lists in `dataset/constant/Element.ts`, and every
  `LayoutEngine` hunk. Covered by [tests/integration/paragraph-indent.test.ts](tests/integration/paragraph-indent.test.ts).
  - *Left out:* the seed-row branch for a resumed computation
    (`isSeedParagraphFirst` is always true without `payload.resume`), the
    `tab` keydown handler, `RangeManager`, `Command`/`CommandAdapt`,
    `Listener`, toolbar. `EDITOR_ELEMENT_PARAGRAPH_STYLE_ATTR` does not
    exist here.

**Catch-up** — older upstream hunks, found by diffing the moved code

- `d89c0ade` (v0.9.124) — *layout shift when typing descended characters*
  #1342. A text element's ascent/descent come from the font's basis metrics,
  not from its glyphs. `METRICS_BASIS_TEXT` was already `'中'`, and the
  removed `curRow.ascent === rowMargin` block was already gone. **Changes
  every text row's height** — see CHANGELOG.
- `c599d563` (2024) — control `flexDirection` #652. The forced row break
  before a checkbox/radio option of a `FlexDirection.COLUMN` control. Covered
  by [tests/integration/control-flex-direction.test.ts](tests/integration/control-flex-direction.test.ts).
- `0111a98f`, `LineNumber` hunk — *not ported on 2026-09-24* because the
  fork measured the number unscaled. With `TextMeasurer` it is measured in
  `${size * scale}px ${font}`, like upstream, so `LineNumber` is now a copy
  and drops the extra `* scale`. The line-number test still holds.
- `17794dd7`, `LineNumber` hunk — `row.fragmentPosition ||`, missed when
  table pagination was ported.

**Not ported**

- `84389f2a` — exclude trace-deleted titles from the catalog #1510. Catalog
  worker.
- `8b947721` — hide the table tool in form mode #1511. `TableTool`.

**Ignored** — no bearing on this library

- `86c142bc` (dev-dependency bumps), `9a1c3d80` (upstream Cypress tests),
  `7cfb52ed`, `09bdb1f3` (README / docs).

**Outside `origin/main`, worth watching:** `origin/feature/pdf` @ `44584893`
(2026-10-27, one commit ahead of `7cfb52ed`) — upstream's own PDF export:
`Draw.getDisplayListPageList` records every page through a `CaptureBackend`,
and `core/export/DisplayListReplayer.ts` + `PdfCanvas.ts` replay the lists
onto jsPDF (same `^4.2.1`), embedding the msyh fonts. It is the editor
exporting itself (needs a live editor and DOM), not a DOM-free renderer like
this one. If it merges, its replayer is the natural counterpart of
`src/core/render/pdf/PdfRenderer.ts`.

Taken from it already, since they fix jsPDF behaviour this fork hits too
(each checked against the real output first; see CHANGELOG):

- `PdfCanvas` font setter → `quoteFontFamily` in `PdfRenderer`. jsPDF's
  context2d resolves a multi-word family only when quoted; unquoted it falls
  back to Times. Covered by [tests/integration/font-family.test.ts](tests/integration/font-family.test.ts).
- `DisplayListReplayer` `rect` → moveTo + three lineTo + closePath in
  `PdfRenderer`; jsPDF's `rect` retraces the top edge and never closes.
  Covered by [tests/integration/rect-path.test.ts](tests/integration/rect-path.test.ts).
- `CommandAdapt._warnUnregisteredPdfFonts` → `DrawPdf._warnUnregisteredPdfFonts`,
  called from `render()`. *Adapted:* `defaultFont` is checked rather than
  assumed registered (fonts are opt-in here), and each family warns once per
  instance. Covered by [tests/integration/font-warning.test.ts](tests/integration/font-warning.test.ts).

Not taken: pattern tiling (the watermark is drawn natively here), re-encoding
every image to PNG (needs DOM, inflates JPEGs), `CaptureBackend` / offscreen
export (editor-only).

**Catch-up prompted by it:** `bc066f33` (`origin/main`, 2026-02-01) — image
crop #1327. `_drawImageWithCrop` copied into `ImageParticle`. *Adapted:*
jsPDF's 9-argument `drawImage` places the cropped region right but paints
the whole image around it, so the call is wrapped in a clip to the
destination rectangle (the branch instead pre-crops on a DOM canvas). Covered
by [tests/integration/image-crop.test.ts](tests/integration/image-crop.test.ts).

### 2026-10-23 — reviewed `1d7cd1a7..origin/main` (6 commits)

Upstream released **1.0.6**, which bundles everything ported on 2026-10-15
plus the two features below. `devDependencies` bumped to
`@hufe921/canvas-editor@^1.0.6` (the consumer-boundary check passes).

**Ported**

- `75b4c14e` — area minimum height #1051. `IAreaStyle.minHeight`,
  `IAreaRule.resizable`, `IAreaPaddingSegment` / `IAreaInfo.paddingSegmentList`,
  `IRow.areaPadding` / `areaPaddingCarry`; in `Area`, `applyMinHeight`,
  `computePaddingSegmentList`, the continuation segments in `render` and
  `minHeight` in `computeProps`; in `DrawPdf`, `getMainRowList`, the
  `applyMinHeight` call at the end of `computeRowList`, the carry-over branch
  in `_computePageList` (including the blank continuation page), and
  `areaPadding` subtracted from `rowContentHeight` in `_drawHighlight` and
  `drawRow`. Covered by
  [tests/integration/area-min-height.test.ts](tests/integration/area-min-height.test.ts).
  - *Left out:* `AreaTool` (the drag handle, a DOM overlay) with its CSS,
    `mousedown`/`GlobalEvent` hooks and the `render`/`setCursor`/
    `clearSideEffect` call sites. The `Position` hunk only keeps the per-page
    position cache aligned on blank pages; that cache belongs to the
    incremental layout (`ffa18f9c`, not ported) — the fork's
    `computePositionList` already skips an empty page.
  - `resizable` is copied for type parity only; nothing reads it here.
- `a3b2a93d` — checkbox cross mark #1501. `CheckboxMarkType` (new enum in
  `dataset/enum/Common.ts`), `markType` on `ICheckbox`, `ICheckboxOption` and
  `IControlCheckbox`, the default in `dataset/constant/Checkbox.ts`, the
  element → control → option fallback in `CheckboxParticle.render`, and the
  `ListParticle` hunk. Covered by
  [tests/integration/checkbox.test.ts](tests/integration/checkbox.test.ts).
  - *Left out:* the `src/editor/index.ts` export — the fork's entry point
    exports no enums; consumers use upstream's `CheckboxMarkType`, which is
    assignable to the local copy.
- `3cf52b4f` — `checkMarkColor` for checkbox #1367. **Catch-up from outside
  this window** (upstream 0.9.128, February 2026): found because `a3b2a93d`
  builds on it. It was never ported, so the fork still read `fillStyle` as
  the checked fill and `strokeStyle` as the tick — the pre-0.9.128 meaning —
  while every editor inside the peer range (`>=0.9.133`) uses them for the
  unchecked box. Ported whole (`CheckboxParticle`, the defaults, the three new
  `ICheckboxOption` fields); recorded as a consumer-facing *Changed* entry in
  CHANGELOG. `RadioParticle` was checked for the same lag and is aligned.

**Not ported**

- `b598ce92` — 24-hour date control and parsing by `dateFormat` #1503.
  `DatePicker` only: how the popup reads the current value and what it writes
  back. The rendered date is whatever text the element already holds.

**Ignored** — no bearing on this library

- `d41e03ef` (release), `ced4746b` (`prepublishOnly` script), `f150290d`
  (dev-dependency bumps).

### 2026-10-15 — reviewed `4a2bf92c..origin/main` (1 commit)

Our fix for the `spacingAfter` quirk recorded in the block below, sent
upstream and merged the same day.

**Ported**

- `1d7cd1a7` — exclude paragraph `spacingAfter` from row decorations #1498.
  `rowContentHeight` in `_drawHighlight` and `drawRow`: highlight, underline,
  line-break marker and the group fill. Covered by the two decoration cases
  in [tests/integration/paragraph-spacing.test.ts](tests/integration/paragraph-spacing.test.ts).
  - *Adapted:* the control-border and `rangeRecord` lines changed only inside
    the fork's commented-out blocks; there is no white-space marker or
    `TraceParticle` here.

### 2026-10-15 — reviewed `b4bea504..origin/main` (16 commits)

Upstream released **1.0.4** and **1.0.5** in this window; the two features
that render landed after 1.0.5. `devDependencies` bumped to
`@hufe921/canvas-editor@^1.0.5` (the consumer-boundary check passes).

**Ported**

- `124bbcc5` — paragraph spacing #499. `spacingBefore`/`spacingAfter` on
  `IElementStyle`, `spacingAfter` on `IRow`, the two `computeRowList` hunks
  (`offsetY` on a paragraph's first row, extra `height` on its last), the
  `group.recordFillInfo` height, and the attribute lists in
  `dataset/constant/Element.ts`. Covered by
  [tests/integration/paragraph-spacing.test.ts](tests/integration/paragraph-spacing.test.ts).
  - *Left out:* `Position.getPositionByXY` (click hit-testing in the offset
    area), `RangeManager`/`IRangeStyle`, `Command`/`CommandAdapt`, toolbar.
    `EDITOR_ELEMENT_PARAGRAPH_STYLE_ATTR` does not exist here. The two
    `rangeRecord.height` lines were updated inside the commented-out
    selection block, to keep it diffable.
  - Upstream quirk, kept: `spacingAfter` is folded into `curRow.height`, and
    only selection and group fills subtract it back. The underline
    (`y + curRow.height - rowMargin`) and highlight on a paragraph's last row
    therefore sit against the taller row — the underline drops into the gap.
    *Fixed upstream in `1d7cd1a7` (#1498) and ported — see the block above.*
- `4a2bf92c` — table cell border colour/width #1053. `ITd.borderColor` /
  `borderWidth`, `TABLE_TD_ZIP_ATTR`, and the deferred-stroke pass in
  `TableParticle.render`. Covered by
  [tests/integration/table-td-border.test.ts](tests/integration/table-td-border.test.ts).
  - *Left out:* `TableOperate.tableTdBorderColor/Width`, `Command`, and the
    `createDomFromElementList` hunk — the fork's copy is a vestigial clipboard
    exporter with no callers and its `mergeOption` line commented out, which
    the new code reads `defaultBorderColor` from.
- `71aa0996` — honor `extraPickAttrs` for table row/cell identities #1492.
  Both `zipElementList` hunks; reachable through `DrawPdf.getValue`.

**Not ported**

- `93599dab` — control highlight overflow with several controls in a row.
  Fixes upstream's run-merging in `drawHighlight` when the colour comes from
  `getControlHighlight`. This fork's `_drawHighlight` already diverged: it
  renders every highlighted element on its own and has no control-colour
  source (`ControlSearch` is gone), so the bug cannot occur.
- `921e9243` — per-control background colours. Lives in `ControlSearch`; the
  `IControlBasic` fields were not copied either (that interface already lags
  upstream's control-only fields).
- `ffa18f9c` — row-level incremental layout #837 (`lab.incrementalCompute`,
  off by default). Edit-driven: dirty ranges, row snapshots and resume
  points, plus a per-page position cache. A one-shot export lays out once, so
  there is nothing to reuse. The `ListParticle` hunks only route mutations
  through the new `setElementProperty` accessors; `getSlimCloneElementList`
  is history-only. Neither changes output. The `lab` option was not added.
- `d9af16b5` — skip history snapshots when `historyMaxRecordCount === 0`.
  History.
- `bc4fcd70`, `a68c0e46` — caret formatting toggles, shift+click selection
  anchor. `CommandAdapt`, cursor and events.

**Ignored** — no bearing on this library

- `9af964c2`, `f8435acb` (releases; the latter also reformats two
  `CommandAdapt` lines), `b943af57`, `9503e3db`, `1d5fb8e3` (dependency
  bumps), `f5d6837b` (`mock.ts`), `e8d0be8f` (upstream test).

### 2026-09-24 — reviewed `bd590116..origin/main` (3 commits)

Two upstream "misc bug" sweeps, no release. Of the four hunks that touch a
render path, one came over cleanly, one came over as dead code, and two were
**deliberately left out because porting them would break this fork**.

**Ported**

- `0111a98f` — misc editor bugs in controls, table tools and range handling.
  Only two hunks of it.
  - `LabelParticle`: background height used `padding[0] + padding[3]`
    (top + left) instead of `padding[0] + padding[2]` (top + bottom).
    Covered by [tests/integration/label.test.ts](tests/integration/label.test.ts).
  - `Draw.getContextInnerWidth`: reads the unscaled `options.table.tdPadding`
    instead of the scaled `getTdPadding()`, since `td.width` is unscaled.
    Nothing in this fork calls `getContextInnerWidth` (upstream's only caller
    is `TableOperate`); copied so `DrawPdf` stays diffable.
  - *Left out:* the `LineNumber` hunk — see *Not ported*. `setPageMode`
    (resizes `<canvas>` styles), and the `Control`, `TableTool`, `DatePicker`,
    `CommandAdapt`, `ContextMenu`, drag-handler and `Signature` hunks.

**Not ported**

- `0111a98f`, `LineNumber` hunk — drops `* scale` from the measured width and
  ascent. Correct upstream, where `ctx.measureText` sees the `size * scale`
  font set just before it. **Wrong here**: this fork's
  `TextParticle.measureText` ignores `ctx2d.font` and measures via
  `draw.getFont(element)` at scale 1, so the width already arrives unscaled
  and the existing `(width + right) * scale` is right. Ported verbatim, the
  numbers drift right as `scale` grows. Guarded by
  [tests/integration/line-number.test.ts](tests/integration/line-number.test.ts).
  (Side effect of the same divergence, pre-existing and not fixed: the line
  number is measured with `defaultSize`/`defaultFont`, not `lineNumber.size`
  / `lineNumber.font`.) *Ported on 2026-10-30, once `TextMeasurer` made the
  measurement scaled — see that block.*
- `b4bea504`, `ImageParticle` hunk — `{imageNo}` in image captions.
  **Upstream regression; do not port as-is.** The old code counted images
  inside a table cell wrongly (the nested `break` only left the inner loop,
  so images after the table were counted too). The fix returns `-1` on
  hitting the target *at any depth, including the top level*, and the caller
  clamps with `Math.max(…, 0) + 1` — so every image is numbered **1**. For
  `[img, img, table[img], img]` the old code gives 1, 2, 4, 4; the new one
  1, 1, 1, 1; correct is 1, 2, 3, 4. Revisit when upstream fixes it (worth
  reporting there).
- `b4bea504`, rest — `DatePicker`, `BaseBlock` resize handles, `TableOperate`
  empty-row insertion, `TableTool` and `Search` replace. All editor-only.

**Ignored** — no bearing on this library

- `d06ad7ff` (dev-dependency bump).

### 2026-09-14 — reviewed `6a554b4f..origin/main` (20 commits)

Upstream released **1.0.1**, **1.0.2** and **1.0.3** in this window. A quiet
window for this fork: one line of it renders.

**Ported**

- `ad684544` — table slash pollutes page corner color #1476. One line:
  `beginPath()` before `_drawSlash` lays down its diagonal. Without it the
  slash's `stroke()` also repaints whatever path was still open — the table
  outline it had just drawn, or the page margin indicators — in the table's
  border colour. Covered by [tests/integration/table-slash.test.ts](tests/integration/table-slash.test.ts),
  which reads the page's path operators back out of the PDF.

**Not ported**

- `04e37352` — configurable spellcheck #1106. A new `core/draw/interactive/`
  module: it holds a range list built from a plugin's dictionary lookups and
  paints squiggles under the misspelled words, gated on `!isPrintMode` like
  `Search` beside it. Screen-only decoration by construction, plus a `Command`
  API, an eventbus event and `mousedown` handling. Added to the subsystem list.
- `3f61e23c`, `86aa51cc`, `099b94e1` — `isOverwrite` on the set-control-value
  API, duplicated placeholder on empty control value, inserting multiple
  controls in one line. `Control`/`CommandAdapt`, removed in PR #9.
- `480cd951`, `fde11fa6` — `getSurroundElementList` and `getGroupRectList`
  command APIs. Both read the cursor range and return geometry for DOM
  overlays; `Command`/`CommandAdapt`.

**Ignored** — no bearing on this library

- `3d27125a`, `83985f72`, `473169f6` (releases), `0c8cdd05`, `fd5bc00e`,
  `99a06c79`, `03a481bb`, `47f49af8` (dependency bumps), `bd590116`,
  `0d9d8b7c`, `3db6563a`, `7adb602b`, `165885f2` (plugin-list docs).

### 2026-08-11 — reviewed `eba1d108..origin/main` (9 commits)

Upstream released **1.0.0** in this window (`1533a220` is the release commit
itself — CHANGELOG, README and a version bump, no code).

**Ported**

- `499c239d` — mixed page orientations by section #718 #866. The section model
  is small and entirely render-layer: a `PAGE_BREAK` element carries
  `paperDirection`, layout copies it onto the page-break `IRow`, and
  `_computePageList` walks the rows building a `pageDirectionList` that every
  geometry getter then indexes by page. `getOriginalWidth/Height`, `getWidth`,
  `getHeight`, `getInnerWidth`, `getMargins`, `getOriginalMargins` and
  `getMainOuterHeight` all take an optional direction; `getPageSize(pageNo)`
  bundles the four values callers actually want. `Header`/`Footer` swap their
  single `rowList`/`positionList` for a `layoutMap` keyed by direction (lazy
  per direction), `ColumnManager` precomputes both directions, and
  `TablePaging` tracks the current section while splitting.
  - *Left out:* `setPageDirection` (reads the cursor range and the active zone
    to find the enclosing section — this fork has neither, and consumers set
    `paperDirection` on the element directly); `getPageOffset` /
    `_getPageMaxWidth` / `_updatePageSizes` and the `HyperlinkParticle`,
    `ImageParticle`, `BaseBlock`, `DatePicker`, `TableTool`, `Previewer`,
    `Search`, `Cursor` and `Zone` call sites, which exist only to re-position
    DOM overlays over CSS-centred canvases; `utils/print.ts`.
  - *Adapted:* upstream resizes `<canvas>` elements per page; here the
    direction reaches the output through `_createPage`, which already passed an
    orientation to `jsPDF.addPage` and now takes it from `getPageDirection(pageNo)`.
    Uncovered a **pre-existing off-by-one** in that path — see CHANGELOG; the
    page-break `isForceBreak` clause came along since row splitting on a break
    is what makes a section start at a row boundary.

**Not ported**

- `1855372c` — hover hint for elements #762. `HintParticle` builds a DOM popup
  driven by `mousemove`. Its data-layer half (`hint` on `IElement`/`ITd`,
  inheritance from title/list/area/hyperlink containers, the `hint` option) has
  no render path here either — nothing reads `hint` at paint time.
- `6a554b4f` — cascade expression functions. `Control` module, removed in PR #9.
- `21bed9ba` — row layout by paragraph #605. Touches only `CommandAdapt`,
  the backspace/delete key handlers and `RangeManager`.

**Ignored** — no bearing on this library

- `1533a220` (release notes + version bump), `403b1d88`, `77819319`
  (dependency bumps), `f1d3f522` (dependabot config), `561fb3fc` (docs).

**Note on the clone.** The 1.0.0 checkout has a single remote (`origin` =
Hufe921) and sits on `main`, so `HEAD` and `origin/main` agree here — unlike
the previous clone. `origin/improve/performance` @ `30e14e55` is still not
merged into `main`; the `TextParticle` measurement caching in it remains the
part worth revisiting.

### 2026-08-01 — reviewed `d5bad244..origin/main` (1 commit)

**Not ported**

- `eba1d108` — compare api #1024. A `compare` command that diffs two documents
  and writes the result as *trace* records. Every piece lands in a subsystem
  this fork removed: `Command`/`CommandAdapt`, `TraceParticle` (a DOM popup),
  and the new `interface/Compare.ts`. The new `utils/diff.ts` (697 lines) is
  self-contained and portable in principle, but its only consumer is the
  command, and its output — trace records — is never drawn here. The
  `getNonTraceElementList` helper added to `utils/element.ts` builds on
  `getNonDeletedElementList`, which this fork does not have either.

**Also present in the clone, outside the window**

- `origin/improve/performance` @ `30e14e55` — *improve: render performance.*
  Not on `origin/main`, so not part of this window, but worth watching: it
  touches `Draw.ts` (+355), adds `IncrementalRowCompute.ts`, and reworks
  `TextParticle` measurement. The incremental-row half is input-event driven
  (recompute only the rows an edit touched) and buys nothing for a one-shot
  export. The `TextParticle` half might: it caches `measureBasisWord` per font
  and threads an explicit `font` argument through `measureText`/`measureWord`
  to avoid reading `ctx.font` per element. Revisit if it merges — a jsPDF
  `Context2d` has different `ctx.font` read costs than a browser canvas, so
  measure before assuming a win.
- `94a1b012` — *fix: render vertical ruler on every page #438*, and the dirty
  `index.html` / `src/main.ts` / `PROPOSTA-recuo-paragrafo.md` in the working
  tree: local work on the `fork` remote, not upstream. Excluded by request.

### 2026-07-27 — reviewed `56a51c42..d5bad244` (9 commits)

**Ported**

- `17794dd7` — table pagination #41. Render-layer fragment split.
  - *Left out:* `_repairTableContextAfterTruncate` (cursor/selection
    migration) and the range-drawing arguments.
  - *Adapted:* trace-mode clause dropped from the hidden-content check
    (`TablePaging.ts`); `isMainActive` treated as always-true
    (`Position.ts`); `isAreaHideDisabled()` and `getIsPagingMode()` copied
    from upstream into `DrawPdf`, which lacked them.
- `9e54b8c2` — row-height fix for row-spanning cells. Ported whole.
- `66c9b940` — table width autofit.
  - *Left out:* the context-menu autofit commands (editor-only).

**Not ported**

- `d5bad244` — ruler option #438. Draws on its own canvases in a `<div>`
  inserted outside the page container: a screen overlay.
- `342dea66`, `56fdf609` — control cascade / validation / member state. The
  `Control` module was removed in PR #9.

**Ignored** — no bearing on this library

- `49f9aad0` (dev-dependency bump), `cb106129`, `53f6ca8a` (docs).

### Earlier

Alignment before this point is not logged commit-by-commit — it predates this
file. What landed is described per-release in [CHANGELOG.md](CHANGELOG.md);
the recurring reasons for skipping are in the subsystem list below.

## Subsystems this fork does not have — skip on sight

Indexed by **subsystem, not by commit**, so it stays short: one row covers
every past *and future* upstream commit touching that area. A commit skipped
for one of these reasons needs no explanation beyond naming it in the log.

| Subsystem | Why it can't reach the PDF |
|---|---|
| Cursor, selection / `RangeManager` | Removed in PR #9. No caret exists during export. |
| Events — mouse, keyboard, paste, drag, shortcuts | Removed in PR #9. Nothing is interactive. |
| Controls (form controls) | The `Control` module was removed in PR #9. Includes cascade, validation, member state. |
| Trace mode (track changes) | Editor review UI. |
| Compare / diff (`utils/diff.ts`, `interface/Compare.ts`) | Diffs two documents into trace records. Reaches the page only through trace rendering, which is absent. |
| Hover hints (`HintParticle`, `element.hint`) | DOM popup driven by `mousemove`. Nothing reads `hint` at paint time. |
| Macro recording / playback | Editor command plumbing. |
| Accessibility (ARIA, screen readers) | DOM-only. |
| Screen overlays — magnifier, ruler | Draw on their own canvases/elements outside the page container. |
| Paragraph drag (`ParagraphDragParticle`, `options.paragraphDrag`) | A handle shown on hover and a drag-to-move gesture; off by default and driven by mouse events. |
| Multi-page view (`PageLayoutManager`, `options.pageLayout`) | Places page canvases side by side in the scroll container. The PDF has no view. |
| Incremental / scale-reuse layout (`IncrementalRowComputer`, `ScaledRowComputer`, page position cache, `ElementListSnapshot`) | Reuses the previous layout after an edit or zoom. An export lays out once. |
| Spellcheck (`core/draw/interactive/Spellcheck.ts`) | Squiggles under misspelled words, gated on `!isPrintMode`. Fed by a plugin's dictionary lookups through a command API. |
| Context menu, toolbar, CSS, demo app chrome | Not document content. (`I18n` *is* still present and instantiated by `DrawPdf` — don't assume it's gone.) |
| Zone switching (header/footer active zone) | Editor focus concept; export always renders all zones. |
| Previewer, table tool/operate, search, worker | Removed in PR #9. |

## How to review

List everything since the last review. Use `origin/main`, **not `HEAD`** — the
checkout may sit on a local or fork branch, which both hides upstream commits
and drags in ones that were never upstream:

```bash
git -C <upstream> remote -v                    # confirm origin = Hufe921
git -C <upstream> log --oneline bd590116..origin/main
```

Then narrow to the files that can affect output:

```bash
git -C <upstream> log --oneline 6a554b4f..origin/main -- \
  src/editor/core/draw src/editor/core/position src/editor/utils
```

Replace `bd590116` with the "Reviewed through" value above.

Review **`origin/main` only**. Upstream's unmerged branches (`feature/*`,
`improve/performance`) are long-abandoned — most sit a thousand-plus commits
behind `main` — and nothing there is worth porting ahead of a merge.

When done, add a log block for the window and update **Last check**.

## Decision rule

**Skip** when the commit touches CSS, toolbar SVGs, `Command`/`CommandAdapt`,
context menus, `index.html`/`main.ts`, or creates DOM elements — that is
editor chrome and never reaches the PDF.

**Look** when it touches `core/draw/Draw.ts`, `core/layout/`,
`core/draw/particle/`, `core/draw/frame/`, `core/position/`, or
`utils/element.ts` computing content geometry, layout, pagination or
measurement.

`core/render/model/` (`IRenderContext`, `DisplayList`) is mirrored in
[src/core/render/model/](src/core/render/model/) — port changes there. The
canvas/SVG backends, surfaces and the SVG scene compiler are the editor's
output surfaces; [src/core/render/pdf/](src/core/render/pdf/) stands in for
them, so skip those unless a change alters *what* a particle asks to draw.

Many commits are **partial**: the layout half is portable while the
keyboard/menu half is not. Port the half that renders, and record what was
left out in the log entry.

## How to port

Copy the upstream code **verbatim**. The only allowed changes are mechanical:

- `Draw` → `DrawPdf`, `ctx` → `ctx2d`, import paths. Drawing code takes
  `ctx2d: IRenderContext`, as upstream's takes `ctx: IRenderContext`; only
  layout/measuring code sees jsPDF's real `Context2d`.
- Deleting references to modules this fork does not have — matching the form
  the fork already uses for the same expression elsewhere.

One rule specific to this fork: a particle never calls `this.draw.getPdf()`
while drawing. `_drawPage` records into a `DisplayList` that is replayed
afterwards, so a direct jsPDF call would run before the drawing it belongs
to. Go through `ctx2d` (`setFont`, `setGState`, `setCharSpace`, `addImage`),
adding a recorded operation to `IRenderContext` / `DisplayList` if needed.

Do **not** re-derive an algorithm "the way it should work". A rewritten port
of the nested-list numbering once shipped broken; faithful copies also stay
diffable against future upstream versions. If a hunk can't be copied cleanly,
stop and ask rather than inventing a substitute.

Files mirror upstream paths (`src/editor/core/draw/…` → `src/core/draw/…`), so
`patch`/`git apply` often works on files the fork hasn't diverged from.
That includes layout: since `cf51314a` (October 2026) `computeRowList` and
the page split live in `core/layout/LayoutEngine.ts` on both sides
([src/core/layout/LayoutEngine.ts](src/core/layout/LayoutEngine.ts) here),
reaching back into the draw object through the same accessors. If a hunk
calls a `draw.getX()` that `DrawPdf` lacks, add the accessor to `DrawPdf`
rather than rewriting the call. The `// 中文` comments are a hint that a
line came from upstream.

Validate with a test that asserts on the **real PDF** (via `pdfjs-dist`), not
just `tsc`. See [tests/integration/](tests/integration/).

## Getting the upstream checkout

Clone it anywhere and point the `<upstream>` in the commands above at it:

```bash
git clone https://github.com/Hufe921/canvas-editor
```

Check out the source matching the `@hufe921/canvas-editor` version in
[package.json](package.json)'s `devDependencies` — `peerDependencies` carries a
wide compatibility range, not the version this fork is aligned with — then
`git pull` to see what has landed since.
