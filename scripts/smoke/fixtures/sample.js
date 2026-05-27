// Shared IEditorData fixture used by both browser and node smoke tests.
// Exercises every code path that changed in v0.4.0:
//   - text with multiple weights (font measurement via fakeCtx)
//   - msyh / CJK text (Skia metrics vs DOM canvas metrics)
//   - inline PNG image (ctx2d.drawImage)
//   - table (TableParticle + Position)
//   - watermark with repeat:true (platform.createCanvas + measureText)
//   - LaTeX element (platform.svgToPngDataUrl via @resvg/resvg-js in Node)
//   - 2 pages worth of content (header/footer/page number pipeline)

// Tiny 1x1 transparent PNG inline so the image path doesn't depend on disk.
const TRANSPARENT_PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

export const sampleEditorData = {
  header: [
    { value: 'Smoke test header', size: 12, bold: true }
  ],
  main: [
    { value: 'Plain Arial regular. ', size: 14, font: 'arial' },
    { value: 'Bold ', size: 14, font: 'arial', bold: true },
    { value: 'and italic.', size: 14, font: 'arial', italic: true },
    { value: '\n' },
    { value: 'CJK measurement: 你好世界 (msyh).', size: 14, font: 'microsoft yahei' },
    { value: '\n' },
    // Inline image
    {
      type: 'image',
      value: TRANSPARENT_PNG_1X1,
      width: 80,
      height: 30
    },
    { value: '\n' },
    // Table
    {
      type: 'table',
      colgroup: [{ width: 100 }, { width: 100 }, { width: 100 }],
      trList: [
        {
          height: 30,
          tdList: [
            { colspan: 1, rowspan: 1, value: [{ value: 'A1' }] },
            { colspan: 1, rowspan: 1, value: [{ value: 'B1' }] },
            { colspan: 1, rowspan: 1, value: [{ value: 'C1' }] }
          ]
        },
        {
          height: 30,
          tdList: [
            { colspan: 1, rowspan: 1, value: [{ value: 'A2' }] },
            { colspan: 1, rowspan: 1, value: [{ value: 'B2' }] },
            { colspan: 1, rowspan: 1, value: [{ value: 'C2' }] }
          ]
        }
      ]
    },
    { value: '\n' },
    // LaTeX — exercises platform.svgToPngDataUrl
    {
      type: 'latex',
      value: '\\frac{1}{2}'
    },
    { value: '\n' },
    // Filler to push to page 2
    { value: 'X '.repeat(2000), size: 12, font: 'arial' }
  ],
  footer: [
    { value: 'Footer · page ', size: 10, italic: true }
  ]
}

export const editorOptions = {
  defaultFont: 'arial',
  watermark: {
    data: 'CONFIDENTIAL',
    repeat: true,
    color: '#888',
    size: 32,
    opacity: 0.15,
    gap: [120, 80]
  }
}
