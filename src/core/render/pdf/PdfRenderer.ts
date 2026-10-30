import type { Context2d, jsPDF } from 'jspdf'
import { DisplayList, IRenderMethodName } from '../model/DisplayList'
import { IRenderPattern } from '../model/RenderContext'

// jsPDF document calls recorded alongside the Context2d ones
const DOCUMENT_METHOD_LIST: IRenderMethodName[] = [
  'setFont',
  'setGState',
  'setCharSpace',
  'addImage'
]

// From upstream's feature/pdf PdfCanvas (44584893): jsPDF's context2d can't
// parse an unquoted multi-word family ('16px Microsoft YaHei') and falls back
// to its default font, which garbles CJK text. Quote the family.
function quoteFontFamily(value: string): string {
  const pxIndex = value.indexOf('px ')
  if (~pxIndex) {
    const prefix = value.slice(0, pxIndex + 2)
    let family = value.slice(pxIndex + 3).trim()
    if (
      family.includes(' ') &&
      !family.startsWith('"') &&
      !family.startsWith("'")
    ) {
      family = `"${family}"`
    }
    return `${prefix} ${family}`
  }
  return value
}

export class PdfRenderer {
  public render(ctx: Context2d, pdf: jsPDF, displayList: DisplayList): void {
    const operations = displayList.getOperations()
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i]
      if (operation.type === 'set') {
        const value = operation.value
        if (operation.property === 'font') {
          ctx.font = quoteFontFamily(value as string)
          continue
        }
        ;(ctx as any)[operation.property] = this._isRenderPattern(value)
          ? (ctx as any).createPattern(value.image, value.repetition)
          : value
      } else if (DOCUMENT_METHOD_LIST.includes(operation.type)) {
        ;(pdf as any)[operation.type](...operation.args)
      } else if (operation.type === 'rect') {
        // From upstream's feature/pdf DisplayListReplayer: jsPDF's rect never
        // closes the path (it retraces the top edge instead), so the corner
        // where it starts is left unjoined. Draw it as a closed path.
        const [x, y, width, height] = operation.args as number[]
        ctx.moveTo(x, y)
        ctx.lineTo(x + width, y)
        ctx.lineTo(x + width, y + height)
        ctx.lineTo(x, y + height)
        ctx.closePath()
      } else {
        ;(ctx as any)[operation.type](...operation.args)
      }
    }
  }

  private _isRenderPattern(value: unknown): value is IRenderPattern {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      value.type === 'pattern'
    )
  }
}
