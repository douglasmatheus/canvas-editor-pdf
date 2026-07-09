import { Context2d } from 'jspdf'
import { FORMAT_PLACEHOLDER } from '../../../dataset/constant/PageNumber'
import { NumberType } from '../../../dataset/enum/Common'
import { RowFlex } from '../../../dataset/enum/Row'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { convertNumberToChinese } from '../../../utils'
import { DrawPdf } from '../DrawPdf'

export class PageNumber {
  private draw: DrawPdf
  private options: DeepRequired<IEditorOption>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
  }

  static formatNumberPlaceholder(
    text: string,
    pageNo: number,
    replaceReg: RegExp,
    numberType: NumberType
  ) {
    const pageNoText =
      numberType === NumberType.CHINESE
        ? convertNumberToChinese(pageNo)
        : `${pageNo}`
    return text.replace(replaceReg, pageNoText)
  }

  public render(ctx2d: Context2d, pageNo: number) {
    const {
      scale,
      pageNumber: {
        size,
        font,
        color,
        rowFlex,
        numberType,
        format,
        startPageNo,
        fromPageNo
      }
    } = this.options
    if (pageNo < fromPageNo) return
    // 处理页码格式
    let text = format
    const pageNoReg = new RegExp(FORMAT_PLACEHOLDER.PAGE_NO)
    if (pageNoReg.test(text)) {
      text = PageNumber.formatNumberPlaceholder(
        text,
        pageNo + startPageNo - fromPageNo,
        pageNoReg,
        numberType
      )
    }
    const pageCountReg = new RegExp(FORMAT_PLACEHOLDER.PAGE_COUNT)
    if (pageCountReg.test(text)) {
      text = PageNumber.formatNumberPlaceholder(
        text,
        this.draw.getPageCount() - fromPageNo,
        pageCountReg,
        numberType
      )
    }
    const width = this.draw.getWidth()
    // 计算y位置
    const height = this.draw.getHeight()
    const pageNumberBottom = this.draw.getPageNumberBottom()
    const y = height - pageNumberBottom
    ctx2d.save()
    ctx2d.fillStyle = color
    // Resolve the font exactly like the body-text path (TextParticle): fonts
    // register with jsPDF under a lowercased id (e.g. 'microsoft yahei'), so
    // the family must be lowercased to match, and setFont must be called
    // explicitly. A previous hack instead rewrote 'Microsoft YaHei' → 'Yahei'
    // (a font that was never registered), which forced a Latin fallback and
    // rendered CJK page numbers (e.g. 第{pageNo}页/共{pageCount}页) as garbage.
    const family = font.toLowerCase()
    const fontString = `${size * scale}px ${family}`
    ctx2d.font = fontString
    this.draw.getPdf().setFont(family, '', 'normal')
    // 计算x位置-居左、居中、居右
    let x = 0
    const margins = this.draw.getMargins()
    // Measure with the same font we draw in (fakeCtx would otherwise measure
    // against whatever font it last held), so centered/right flex is accurate.
    const { width: textWidth } = this.draw.measureText(fontString, text)
    if (rowFlex === RowFlex.CENTER) {
      x = (width - textWidth) / 2
    } else if (rowFlex === RowFlex.RIGHT) {
      x = width - textWidth - margins[1]
    } else {
      x = margins[3]
    }
    ctx2d.fillText(text, x, y)
    ctx2d.restore()
  }
}
