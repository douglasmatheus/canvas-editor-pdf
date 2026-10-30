import type { GState, jsPDF } from 'jspdf'
import {
  IRenderContext,
  IRenderImageSource,
  IRenderPattern
} from './RenderContext'

export type IRenderMethodName =
  | 'save'
  | 'restore'
  | 'fillRect'
  | 'beginPath'
  | 'moveTo'
  | 'lineTo'
  | 'arc'
  | 'quadraticCurveTo'
  | 'bezierCurveTo'
  | 'rect'
  | 'closePath'
  | 'fill'
  | 'strokeRect'
  | 'scale'
  | 'rotate'
  | 'clip'
  | 'fillText'
  | 'translate'
  | 'stroke'
  | 'drawImage'
  | 'setLineDash'
  // canvas-editor-pdf: see the note on IRenderContext
  | 'clearRect'
  | 'setFont'
  | 'setGState'
  | 'setCharSpace'
  | 'addImage'

export type IRenderOperation =
  | {
      type: 'set'
      property: string
      value: unknown
    }
  | {
      type: IRenderMethodName
      args: unknown[]
    }

interface IRenderState {
  lineWidth: number
  lineDash: number[]
  // canvas-editor-pdf: TextParticle keys its measure cache on ctx.font
  font: string
}

export class DisplayList implements IRenderContext {
  private operations: IRenderOperation[]
  private state: IRenderState
  private stateStack: IRenderState[]

  constructor() {
    this.operations = []
    this.state = {
      lineWidth: 1,
      lineDash: [],
      font: ''
    }
    this.stateStack = []
  }

  public getOperations(): readonly IRenderOperation[] {
    return this.operations
  }

  public get lineWidth(): number {
    return this.state.lineWidth
  }

  public set lineWidth(value: number) {
    this.state.lineWidth = value
    this.set('lineWidth', value)
  }

  public set fillStyle(
    value: string | CanvasGradient | CanvasPattern | IRenderPattern
  ) {
    this.set('fillStyle', value)
  }

  public set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.set('strokeStyle', value)
  }

  public get font(): string {
    return this.state.font
  }

  public set font(value: string) {
    this.state.font = value
    this.set('font', value)
  }

  public set globalAlpha(value: number) {
    this.set('globalAlpha', value)
  }

  public set textAlign(value: 'center' | 'end' | 'left' | 'right' | 'start') {
    this.set('textAlign', value)
  }

  public set textBaseline(value: CanvasTextBaseline) {
    this.set('textBaseline', value)
  }

  public set lineCap(value: 'butt' | 'round' | 'square') {
    this.set('lineCap', value)
  }

  public set lineJoin(value: 'bevel' | 'miter' | 'round') {
    this.set('lineJoin', value)
  }

  public setLineDash(segments: number[]): void {
    this.state.lineDash = [...segments]
    this.record('setLineDash', segments)
  }

  public getLineDash(): number[] {
    return [...this.state.lineDash]
  }

  public createPattern(
    image: CanvasImageSource,
    repetition: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'
  ): IRenderPattern {
    return {
      type: 'pattern',
      image,
      repetition
    }
  }

  public save(): void {
    this.stateStack.push({ ...this.state })
    this.record('save')
  }

  public restore(): void {
    const state = this.stateStack.pop()
    if (state) this.state = state
    this.record('restore')
  }

  public fillRect(x: number, y: number, width: number, height: number): void {
    this.record('fillRect', x, y, width, height)
  }

  public beginPath(): void {
    this.record('beginPath')
  }

  public moveTo(x: number, y: number): void {
    this.record('moveTo', x, y)
  }

  public lineTo(x: number, y: number): void {
    this.record('lineTo', x, y)
  }

  public arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void {
    this.record('arc', x, y, radius, startAngle, endAngle, counterclockwise)
  }

  public quadraticCurveTo(
    cpx: number,
    cpy: number,
    x: number,
    y: number
  ): void {
    this.record('quadraticCurveTo', cpx, cpy, x, y)
  }

  public bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void {
    this.record('bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y)
  }

  public rect(x: number, y: number, width: number, height: number): void {
    this.record('rect', x, y, width, height)
  }

  public closePath(): void {
    this.record('closePath')
  }

  public fill(): void {
    this.record('fill')
  }

  public strokeRect(x: number, y: number, width: number, height: number): void {
    this.record('strokeRect', x, y, width, height)
  }

  public scale(x: number, y: number): void {
    this.record('scale', x, y)
  }

  public rotate(angle: number): void {
    this.record('rotate', angle)
  }

  public clip(): void {
    this.record('clip')
  }

  public fillText(text: string, x: number, y: number): void {
    this.record('fillText', text, x, y)
  }

  public translate(x: number, y: number): void {
    this.record('translate', x, y)
  }

  public stroke(): void {
    this.record('stroke')
  }

  public drawImage(
    image: IRenderImageSource,
    ...args:
      | [number, number, number, number]
      | [number, number, number, number, number, number, number, number]
  ): void {
    this.record('drawImage', image, ...args)
  }

  public clearRect(x: number, y: number, width: number, height: number): void {
    this.record('clearRect', x, y, width, height)
  }

  public setFont(...args: Parameters<jsPDF['setFont']>): void {
    this.record('setFont', ...args)
  }

  public setGState(gState: GState): void {
    this.record('setGState', gState)
  }

  public setCharSpace(charSpace: number): void {
    this.record('setCharSpace', charSpace)
  }

  public addImage(...args: unknown[]): void {
    this.record('addImage', ...args)
  }

  private set(property: string, value: unknown): void {
    this.operations.push({ type: 'set', property, value })
  }

  private record(type: IRenderMethodName, ...args: unknown[]): void {
    this.operations.push({ type, args })
  }
}
