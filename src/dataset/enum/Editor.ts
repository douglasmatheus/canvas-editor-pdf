// Local copies of enums historically re-exported from @hufe921/canvas-editor.
// See src/dataset/enum/Common.ts for why these are inlined instead of re-exported.

export enum EditorComponent {
  COMPONENT = 'component',
  MENU = 'menu',
  MAIN = 'main',
  FOOTER = 'footer',
  CONTEXTMENU = 'contextmenu',
  POPUP = 'popup',
  CATALOG = 'catalog',
  COMMENT = 'comment'
}

export enum EditorMode {
  EDIT = 'edit',
  CLEAN = 'clean',
  READONLY = 'readonly',
  FORM = 'form',
  PRINT = 'print',
  DESIGN = 'design',
  GRAFFITI = 'graffiti'
}

export enum EditorZone {
  HEADER = 'header',
  MAIN = 'main',
  FOOTER = 'footer'
}

export enum PageMode {
  PAGING = 'paging',
  CONTINUITY = 'continuity'
}

export enum PaperDirection {
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal'
}

export enum WordBreak {
  BREAK_ALL = 'break-all',
  BREAK_WORD = 'break-word'
}

export enum RenderMode {
  SPEED = 'speed',
  COMPATIBILITY = 'compatibility'
}

// EditorContext não está nas exports públicas do @hufe921/canvas-editor, mantido local.
export enum EditorContext {
  PAGE = 'page',
  TABLE = 'table'
}
