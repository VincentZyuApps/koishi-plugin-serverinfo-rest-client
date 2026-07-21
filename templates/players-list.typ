#import "common.typ": *
#set page(width: 390pt, height: auto, margin: 14pt, fill: theme-color("page_bg"))
#set text(font: text-fonts, size: 11pt, fill: theme-color("text"), lang: "zh")

#header([#payload.label 👥 在线玩家 #payload.count])
#v(8pt)
#panel([
  #if payload.players.len() == 0 {
    align(center, [🌙 当前没有玩家在线])
  } else {
    for (index, player) in payload.players.enumerate() {
      grid(columns: (30pt, 1fr), [#(index + 1).], [👤 #player.name])
      if index + 1 < payload.players.len() { v(6pt) }
    }
  }
])
