import { NumberType } from '@hufe921/canvas-editor'
import { WatermarkType } from '../dataset/enum/Watermark'

export interface IWatermark {
  data: string
  type?: WatermarkType
  width?: number
  height?: number
  color?: string
  opacity?: number
  size?: number
  font?: string
  repeat?: boolean
  numberType?: NumberType
  gap?: [horizontal: number, vertical: number]
}