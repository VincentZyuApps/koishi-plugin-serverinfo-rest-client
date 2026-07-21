#import "common.typ": *
#set page(width: 390pt, height: auto, margin: 14pt, fill: page-fill)
#set text(font: text-fonts, size: 11pt, fill: theme-color("text"), lang: "zh")
#let rows = if payload.players.len() == 0 {
  ([--], [当前没有玩家在线])
} else {
  let cells = ()
  for (index, player) in payload.players.enumerate() {
    cells.push([#(index + 1).])
    cells.push([#player.name])
  }
  cells
}

#block(fill: theme-color("header_fill"), stroke: 2pt + theme-color("header_stroke"), radius: 6pt, inset: 10pt, width: 100%)[
  #align(center)[#text(size: 16pt, weight: "bold", fill: theme-color("header_text"))[#payload.label 👥 在线玩家 #payload.count]]
]
#v(8pt)
#block(fill: theme-color("panel_fill"), stroke: 1pt + theme-color("panel_stroke"), radius: 4pt, inset: 12pt, width: 100%)[
  #table(columns: (auto, 1fr), stroke: none, row-gutter: 6pt, ..rows)
]
