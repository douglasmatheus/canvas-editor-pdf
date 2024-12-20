import { IPositionContextChangePayload } from '../../../interface/Listener'
import { Draw } from '@hufe921/canvas-editor/dist/src/editor/core/draw/Draw'

export function positionContextChange(
  draw: Draw,
  payload: IPositionContextChangePayload
) {
  const { value, oldValue } = payload
  // 表格工具移除
  if (oldValue.isTable && !value.isTable) {
    draw.getTableTool().dispose()
  }
}
