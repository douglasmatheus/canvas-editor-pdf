import { Context2d } from 'jspdf'
import { IRowElement } from '../../../interface/Row'

export class SubscriptParticle {
  // 向下偏移字高的一半
  public getOffsetY(element: IRowElement): number {
    return element.metrics.height / 2
  }

  public render(
    ctx2d: Context2d,
    element: IRowElement,
    x: number,
    y: number
  ) {
    ctx2d.save()
    ctx2d.font = element.style
    if (element.color) {
      ctx2d.fillStyle = element.color
    }
    ctx2d.fillText(element.value, x, y + this.getOffsetY(element))
    ctx2d.restore()
  }
}
