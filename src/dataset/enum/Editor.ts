export {
  EditorComponent,
  EditorMode,
  EditorZone,
  PageMode,
  PaperDirection,
  WordBreak,
  RenderMode
} from '@hufe921/canvas-editor'

// EditorContext não está nas exports públicas do @hufe921/canvas-editor, mantido local.
export enum EditorContext {
  PAGE = 'page',
  TABLE = 'table'
}
