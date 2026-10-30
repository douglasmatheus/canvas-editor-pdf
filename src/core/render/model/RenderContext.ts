import type { GState, jsPDF } from 'jspdf'

export interface IRenderPattern {
  type: 'pattern'
  image: CanvasImageSource
  repetition: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'
}

// canvas-editor-pdf: jsPDF also takes an image as a data URL / path string.
export type IRenderImageSource = CanvasImageSource | string

export interface IRenderContext {
  fillStyle: any
  strokeStyle: string | CanvasGradient | CanvasPattern
  font: string
  globalAlpha: number
  textAlign: 'center' | 'end' | 'left' | 'right' | 'start'
  textBaseline: CanvasTextBaseline
  lineWidth: number
  lineCap: 'butt' | 'round' | 'square'
  lineJoin: 'bevel' | 'miter' | 'round'
  save(): void
  restore(): void
  setLineDash(segments: number[]): void
  getLineDash(): number[]
  createPattern(
    image: CanvasImageSource,
    repetition: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'
  ): CanvasPattern | IRenderPattern | null
  fillRect(x: number, y: number, width: number, height: number): void
  strokeRect(x: number, y: number, width: number, height: number): void
  beginPath(): void
  closePath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void
  rect(x: number, y: number, width: number, height: number): void
  fill(): void
  stroke(): void
  clip(): void
  fillText(text: string, x: number, y: number): void
  translate(x: number, y: number): void
  scale(x: number, y: number): void
  rotate(angle: number): void
  drawImage(
    image: IRenderImageSource,
    x: number,
    y: number,
    width: number,
    height: number
  ): void
  drawImage(
    image: IRenderImageSource,
    sx: number,
    sy: number,
    sWidth: number,
    sHeight: number,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number
  ): void
  // canvas-editor-pdf: operations with no canvas counterpart. clearRect is
  // part of jsPDF's Context2d (it paints white); the rest are jsPDF document
  // calls. They are recorded like any other operation so they replay in the
  // same order relative to the drawing around them.
  clearRect(x: number, y: number, width: number, height: number): void
  setFont(...args: Parameters<jsPDF['setFont']>): void
  setGState(gState: GState): void
  setCharSpace(charSpace: number): void
  // jsPDF['addImage'] is overloaded, so Parameters<> would keep only one form
  addImage(...args: unknown[]): void
}
