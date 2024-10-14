import { Context2d } from 'jspdf'
import {
  BackgroundRepeat,
  BackgroundSize
} from '../../../dataset/enum/Background'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { DrawPdf } from '../DrawPdf'

export class Background {
  private draw: DrawPdf
  private options: DeepRequired<IEditorOption>
  private imageCache: Map<string, HTMLImageElement>

  constructor(draw: DrawPdf) {
    this.draw = draw
    this.options = draw.getOptions()
    this.imageCache = new Map()
  }

  private _renderBackgroundColor(
    ctx2d: Context2d,
    color: string,
    width: number,
    height: number
  ) {
    ctx2d.save()
    ctx2d.fillStyle = color
    ctx2d.fillRect(0, 0, width, height)
    ctx2d.restore()
  }

  private _drawImage(
    ctx2d: Context2d,
    imageElement: HTMLImageElement,
    width: number,
    height: number
  ) {
    const { background, scale } = this.options
    // contain
    if (background.size === BackgroundSize.CONTAIN) {
      const imageWidth = imageElement.width * scale
      const imageHeight = imageElement.height * scale
      if (
        !background.repeat ||
        background.repeat === BackgroundRepeat.NO_REPEAT
      ) {
        ctx2d.drawImage(imageElement.src, 0, 0, imageWidth, imageHeight)
      } else {
        let startX = 0
        let startY = 0
        const repeatXCount =
          background.repeat === BackgroundRepeat.REPEAT ||
            background.repeat === BackgroundRepeat.REPEAT_X
            ? Math.ceil((width * scale) / imageWidth)
            : 1
        const repeatYCount =
          background.repeat === BackgroundRepeat.REPEAT ||
            background.repeat === BackgroundRepeat.REPEAT_Y
            ? Math.ceil((height * scale) / imageHeight)
            : 1
        for (let x = 0; x < repeatXCount; x++) {
          for (let y = 0; y < repeatYCount; y++) {
            ctx2d.drawImage(imageElement.src, startX, startY, imageWidth, imageHeight)
            startY += imageHeight
          }
          startY = 0
          startX += imageWidth
        }
      }
    } else {
      // cover
      ctx2d.drawImage(imageElement.src, 0, 0, width * scale, height * scale)
    }
  }

  private _renderBackgroundImage(
    ctx2d: Context2d,
    width: number,
    height: number
  ) {
    const { background } = this.options
    const imageElementCache = this.imageCache.get(background.image)
    if (imageElementCache) {
      this._drawImage(ctx2d, imageElementCache, width, height)
    } else {
      const img = new Image()
      img.setAttribute('crossOrigin', 'Anonymous')
      img.src = background.image
      img.onload = () => {
        this.imageCache.set(background.image, img)
        this._drawImage(ctx2d, img, width, height)
        // 避免层级上浮，触发编辑器二次渲染
        this.draw.render({
          isCompute: false,
          isSubmitHistory: false
        })
      }
    }
  }

  public render(ctx2d: Context2d, pageNo: number) {
    const {
      background: { image, color, applyPageNumbers }
    } = this.options
    if (
      image &&
      (!applyPageNumbers?.length || applyPageNumbers.includes(pageNo))
    ) {
      const { width, height } = this.options
      this._renderBackgroundImage(ctx2d, width, height)
    } else {
      const width = this.draw.getCanvasWidth(pageNo)
      const height = this.draw.getCanvasHeight(pageNo)
      this._renderBackgroundColor(ctx2d, color, width, height)
    }
  }
}
