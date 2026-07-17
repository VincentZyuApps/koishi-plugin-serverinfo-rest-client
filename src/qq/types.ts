export interface QQKeyboard {
  rows: Array<{
    buttons: Array<{
      render_data: { label: string; style: number }
      action: {
        type: number
        permission: { type: number }
        data: string
        enter: boolean
      }
    }>
  }>
}

export interface ImageDimensions {
  width: number
  height: number
}
