import { Command, RowFlex } from '@hufe921/canvas-editor'
import { KeyMap } from '../../../dataset/enum/KeyMap'
import { isApple } from '../../../utils/ua'
import { IRegisterShortcut } from '@hufe921/canvas-editor/dist/src/editor/interface/shortcut/Shortcut'

export const richtextKeys: IRegisterShortcut[] = [
  {
    key: KeyMap.X,
    ctrl: true,
    shift: true,
    callback: (command: Command) => {
      command.executeStrikeout()
    }
  },
  {
    key: KeyMap.LEFT_BRACKET,
    mod: true,
    callback: (command: Command) => {
      command.executeSizeAdd()
    }
  },
  {
    key: KeyMap.RIGHT_BRACKET,
    mod: true,
    callback: (command: Command) => {
      command.executeSizeMinus()
    }
  },
  {
    key: KeyMap.B,
    mod: true,
    callback: (command: Command) => {
      command.executeBold()
    }
  },
  {
    key: KeyMap.I,
    mod: true,
    callback: (command: Command) => {
      command.executeItalic()
    }
  },
  {
    key: KeyMap.U,
    mod: true,
    callback: (command: Command) => {
      command.executeUnderline()
    }
  },
  {
    key: isApple ? KeyMap.COMMA : KeyMap.RIGHT_ANGLE_BRACKET,
    mod: true,
    shift: true,
    callback: (command: Command) => {
      command.executeSuperscript()
    }
  },
  {
    key: isApple ? KeyMap.PERIOD : KeyMap.LEFT_ANGLE_BRACKET,
    mod: true,
    shift: true,
    callback: (command: Command) => {
      command.executeSubscript()
    }
  },
  {
    key: KeyMap.L,
    mod: true,
    callback: (command: Command) => {
      command.executeRowFlex(RowFlex.LEFT)
    }
  },
  {
    key: KeyMap.E,
    mod: true,
    callback: (command: Command) => {
      command.executeRowFlex(RowFlex.CENTER)
    }
  },
  {
    key: KeyMap.R,
    mod: true,
    callback: (command: Command) => {
      command.executeRowFlex(RowFlex.RIGHT)
    }
  },
  {
    key: KeyMap.J,
    mod: true,
    callback: (command: Command) => {
      command.executeRowFlex(RowFlex.ALIGNMENT)
    }
  },
  {
    key: KeyMap.J,
    mod: true,
    shift: true,
    callback: (command: Command) => {
      command.executeRowFlex(RowFlex.JUSTIFY)
    }
  }
]
