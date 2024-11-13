import { IElement } from '@hufe921/canvas-editor'
import { ImageDisplay } from '../dataset/enum/Common'
import { EditorMode, EditorZone } from '../dataset/enum/Editor'
import { IElementPosition } from './Element'
import { IRow } from './Row'

export interface IDrawOption {
  curIndex?: number
  isSetCursor?: boolean
  isSubmitHistory?: boolean
  isCompute?: boolean
  isLazy?: boolean
  isInit?: boolean
  isSourceHistory?: boolean
  isFirstRender?: boolean
}

export interface IForceUpdateOption {
  isSubmitHistory?: boolean
}

export interface IDrawImagePayload {
  width: number
  height: number
  value: string
  imgDisplay?: ImageDisplay
}

export interface IDrawRowPayload {
  elementList: IElement[]
  positionList: IElementPosition[]
  rowList: IRow[]
  pageNo: number
  startIndex: number
  innerWidth: number
  zone?: EditorZone
  isDrawLineBreak?: boolean
}

export interface IDrawFloatPayload {
  pageNo: number
  imgDisplays: ImageDisplay[]
}

export interface IDrawPagePayload {
  elementList: IElement[]
  positionList: IElementPosition[]
  rowList: IRow[]
  pageNo: number
}

export interface IPainterOption {
  isDblclick: boolean
}

export interface IGetValueOption {
  pageNo?: number
  extraPickAttrs?: Array<keyof IElement>
}

export interface IAppendElementListOption {
  isPrepend?: boolean
}

export interface IGetImageOption {
  pixelRatio?: number
  mode?: EditorMode
}

export interface IComputeRowListPayload {
  innerWidth: number
  elementList: IElement[]
  startX?: number
  startY?: number
  isFromTable?: boolean
  isPagingMode?: boolean
  pageHeight?: number
  mainOuterHeight?: number
  surroundElementList?: IElement[]
}