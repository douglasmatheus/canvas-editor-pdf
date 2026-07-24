export interface ITitle {
  fontSize?: number
  fontWeight?: string
  fontFamily?: string
  color?: string
  disabled?: boolean
}

export interface ITitleSizeOption {
  defaultFirstSize?: number
  defaultSecondSize?: number
  defaultThirdSize?: number
  defaultFourthSize?: number
  defaultFifthSize?: number
  defaultSixthSize?: number
}

export type ITitleOption = ITitleSizeOption & {}
