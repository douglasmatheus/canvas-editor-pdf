import type { DisplayList } from './model/DisplayList'

// canvas-editor-pdf: upstream's interface also creates, resizes and observes
// DOM pages. Here pages are jsPDF pages, created by DrawPdf; the backend
// replays each page's display list and grows the continuous-mode page.
export interface IRenderBackend {
  resizeHeight(pageNo: number, height: number, dpr: number): void
  renderPage(pageNo: number, displayList: DisplayList): void
}
