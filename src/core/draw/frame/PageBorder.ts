import { Context2d } from 'jspdf'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { DrawPdf } from '../DrawPdf'
import { Footer } from './Footer'
import { Header } from './Header'

export class PageBorder {
  private draw: DrawPdf
  private header: Header
  private footer: Footer
  private options: DeepRequired<IEditorOption>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.header = draw.getHeader()
    this.footer = draw.getFooter()
    this.options = draw.getOptions()
  }

  public render(ctx2d: Context2d, pageNo: number) {
    const {
      scale,
      pageBorder: { color, lineWidth, padding }
    } = this.options
    ctx2d.save()
    ctx2d.translate(0.5, 0.5)
    ctx2d.strokeStyle = color
    ctx2d.lineWidth = lineWidth * scale
    const {
      margins,
      innerWidth,
      height: pageHeight
    } = this.draw.getPageSize(pageNo)
    // x：左边距 - 左距离正文距离
    const x = margins[3] - padding[3] * scale
    // y：页眉上边距 + 页眉高度 - 上距离正文距离
    const y =
      margins[0] + this.header.getExtraHeight(pageNo) - padding[0] * scale
    // width：页面宽度 + 左右距离正文距离
    const width = innerWidth + (padding[1] + padding[3]) * scale
    // height：页面高度 - 正文起始位置 - 页脚高度 - 下边距 - 下距离正文距离
    const height =
      pageHeight -
      y -
      this.footer.getExtraHeight(pageNo) -
      margins[2] +
      padding[2] * scale
    ctx2d.rect(x, y, width, height)
    ctx2d.stroke()
    ctx2d.restore()
  }
}
