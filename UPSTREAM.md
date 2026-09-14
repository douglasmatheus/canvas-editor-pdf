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
| Date | 2026-09-14 |
| Reviewed through | `bd590116` — *docs: update plugin markdown* (`origin/main`) |
| Upstream version | 1.0.3 |
| Fork commit | `a1d21d5` — *feat: support mixed page orientations by section* |

## Review log

Newest first. The window in each heading is exhaustive — run
`git -C <upstream> log --oneline <window>` to check every commit is accounted
for below.

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

**Look** when it touches `core/draw/Draw.ts`, `core/draw/particle/`,
`core/draw/frame/`, `core/position/`, or `utils/element.ts` computing content
geometry, layout, pagination or measurement.

Many commits are **partial**: the layout half is portable while the
keyboard/menu half is not. Port the half that renders, and record what was
left out in the log entry.

## How to port

Copy the upstream code **verbatim**. The only allowed changes are mechanical:

- `Draw` → `DrawPdf`, `ctx` → `ctx2d`, `CanvasRenderingContext2D` → jsPDF's
  `Context2d`, import paths.
- Deleting references to modules this fork does not have — matching the form
  the fork already uses for the same expression elsewhere.

Do **not** re-derive an algorithm "the way it should work". A rewritten port
of the nested-list numbering once shipped broken; faithful copies also stay
diffable against future upstream versions. If a hunk can't be copied cleanly,
stop and ask rather than inventing a substitute.

Files mirror upstream paths (`src/editor/core/draw/…` → `src/core/draw/…`), so
`patch`/`git apply` often works on files the fork hasn't diverged from. The
`// 中文` comments are a hint that a line came from upstream.

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
