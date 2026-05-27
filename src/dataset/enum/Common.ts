// Local copies of enums historically re-exported from @hufe921/canvas-editor.
// Inlined here so the Node ESM bundle doesn't try named-importing from
// canvas-editor's CJS dist (which Node's ESM-CJS interop can't analyze).
// Keep these in sync with the upstream enum values — they're stable string
// unions, so divergence is unlikely.

export enum MaxHeightRatio {
  HALF = 'half',
  ONE_THIRD = 'one-third',
  QUARTER = 'quarter'
}

export enum NumberType {
  ARABIC = 'arabic',
  CHINESE = 'chinese'
}

export enum ImageDisplay {
  INLINE = 'inline',
  BLOCK = 'block',
  SURROUND = 'surround',
  FLOAT_TOP = 'float-top',
  FLOAT_BOTTOM = 'float-bottom'
}

export enum LocationPosition {
  BEFORE = 'before',
  AFTER = 'after',
  OUTER_BEFORE = 'outer-before',
  OUTER_AFTER = 'outer-after'
}

export enum FlexDirection {
  ROW = 'row',
  COLUMN = 'column'
}
