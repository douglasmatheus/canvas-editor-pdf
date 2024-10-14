import { Command, ListStyle, ListType } from '@hufe921/canvas-editor'
import { KeyMap } from '../../../dataset/enum/KeyMap'
import { IRegisterShortcut } from '@hufe921/canvas-editor/dist/src/editor/interface/shortcut/Shortcut'

export const listKeys: IRegisterShortcut[] = [
  {
    key: KeyMap.I,
    shift: true,
    mod: true,
    callback: (command: Command) => {
      command.executeList(ListType.UL, ListStyle.DISC)
    }
  },
  {
    key: KeyMap.U,
    shift: true,
    mod: true,
    callback: (command: Command) => {
      command.executeList(ListType.OL)
    }
  }
]
