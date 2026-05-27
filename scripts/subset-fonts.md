# Reducing published font size (optional)

The package ships the full TTFs in `public/font/` (copied to `dist/font/` at
build time). Most are small, but **`msyh.ttf` (~19 MB)** and **`msyh-bold.ttf`
(~16 MB)** — Microsoft YaHei, for CJK — dominate the tarball. The published
package is ~42 MB largely because of them.

If you want a smaller npm package, **subset** the fonts: keep only the glyph
ranges you actually need and drop the rest. This is **optional** and **not part
of `npm run build`** — run it manually before a release if you care about size.

> ⚠️ Subsetting overwrites the TTF in place. Back up `public/font/` first, or
> don't commit the subsetted files and just run this before each `npm publish`.

## Prerequisites

```bash
pip install fonttools brotli
```

## Recommended: msyh → Latin + common CJK (~3 MB each)

Covers Latin Extended + GB2312 (common Simplified Chinese, ~6700 glyphs):

```bash
# Back up first
cp -r public/font public/font.original-backup

# msyh regular + bold
for f in msyh.ttf msyh-bold.ttf; do
  pyftsubset "public/font/$f" \
    --output-file="public/font/$f" \
    --unicodes="U+0000-00FF,U+0100-017F,U+2000-206F,U+20A0-20CF,U+2100-214F,U+3000-303F,U+4E00-9FFF" \
    --layout-features="*"
done
```

## Optional: other fonts → Latin Extended only (~200-300 KB each)

The non-CJK fonts (Arial, Calibri, Cambria, Verdana, Segoe UI, Inkfree) only
need Latin coverage:

```bash
for f in Arial.ttf Arial_Bold.ttf Arial_Italic.ttf Arial_Bold_Italic.ttf \
         calibri-regular.ttf calibri-bold.ttf calibri-italic.ttf calibri-bold-italic.ttf \
         Cambria.ttf cambriab.ttf cambriai.ttf cambriaz.ttf \
         Verdana.ttf Verdana_Bold.ttf Verdana_Italic.ttf Verdana_Bold_Italic.ttf \
         Inkfree.ttf segoe-ui.ttf segoe-ui-bold.ttf segoeuii.ttf; do
  pyftsubset "public/font/$f" \
    --output-file="public/font/$f" \
    --unicodes="U+0000-00FF,U+0100-017F,U+2000-206F,U+20A0-20CF,U+2100-214F" \
    --layout-features="*"
done
```

## After subsetting

```bash
du -sh public/font/                 # confirm the size dropped (~7-10 MB total)
npm run build                       # rebuild so dist/font/ picks up the subset
node scripts/smoke/node/run.mjs     # sanity: CJK + Latin still render
```

Then publish as usual. To restore the originals: `rm -rf public/font && mv public/font.original-backup public/font`.

## Trade-offs

- Glyphs outside the subset ranges render as missing (tofu boxes). If your
  documents use traditional Chinese, less-common CJK, or other scripts,
  widen the `--unicodes` ranges accordingly.
- Consumers who need full coverage can always pass `fontSource: 'cdn'` (fetches
  the full TTFs from jsdelivr) or `fontSource: { dir }` (their own fonts).
