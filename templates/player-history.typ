#import "common.typ": *
#set page(width: 620pt, height: auto, margin: 16pt, fill: page-fill)
#set text(font: text-fonts, size: 10pt, fill: theme-color("text"), lang: "zh")
#let rows = if payload.players.len() == 0 {
  ([--], [暂无历史玩家], [--], [--])
} else {
  let cells = ()
  for player in payload.players {
    cells.push([#player.number])
    cells.push([#player.name])
    cells.push([#player.total_play])
    cells.push([#player.last_seen])
  }
  cells
}

#block(fill: theme-color("header_fill"), stroke: 2pt + theme-color("header_stroke"), radius: 6pt, inset: 13pt, width: 100%)[
  #grid(columns: (1fr, auto),
    [#text(size: 20pt, weight: "bold", fill: theme-color("header_text"))[#payload.label 📚 历史玩家]],
    [#text(size: 11pt, weight: "bold", fill: theme-color("header_text"))[共 #payload.total 人]],
  )
]
#v(10pt)
#block(fill: theme-color("panel_fill"), stroke: 1pt + theme-color("panel_stroke"), radius: 4pt, inset: 10pt, width: 100%)[
  #table(
    columns: (34pt, 1.2fr, 1fr, 1.25fr),
    inset: 6pt,
    stroke: 0.6pt + theme-color("panel_stroke"),
    align: (center, left, left, left),
    table.header([#strong[序号]], [#strong[玩家]], [#strong[累计游玩]], [#strong[最后在线]]),
    ..rows,
  )
]
#v(7pt)
#align(center)[#text(size: 8pt, fill: theme-color("stats_text"))[第 #payload.page / #payload.page_count 页 · 数据从统计功能启用后开始累计]]
