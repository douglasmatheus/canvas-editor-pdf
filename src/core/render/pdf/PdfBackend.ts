import type { DrawPdf } from '../../draw/DrawPdf'
import type { DisplayList } from '../model/DisplayList'
import type { IRenderBackend } from '../RenderBackend'
import { PdfRenderer } from './PdfRenderer'

export class PdfBackend implements IRenderBackend {
  private draw: DrawPdf
  private renderer: PdfRenderer

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.renderer = new PdfRenderer()
  }

  // A jsPDF page has a fixed size: change its media box instead of a canvas
  public resizeHeight(pageNo: number, height: number, _dpr: number): void {
    const pdf = this.draw.getPdf()
    pdf.setPage(pageNo + 1)
    pdf.internal.pageSize.height = height
  }

  // DrawPdf has already made the jsPDF page current (setPage) and cleared it
  public renderPage(_pageNo: number, displayList: DisplayList): void {
    const pdf = this.draw.getPdf()
    this.renderer.render(pdf.context2d, pdf, displayList)
  }
}
