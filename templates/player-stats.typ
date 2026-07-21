#import "common.typ": *
#set page(width: 520pt, height: auto, margin: 16pt, fill: page-fill)
#set text(font: text-fonts, size: 11pt, fill: theme-color("text"), lang: "zh")

#block(fill: theme-color("header_fill"), stroke: 2pt + theme-color("header_stroke"), radius: 6pt, inset: 13pt, width: 100%)[
  #text(size: 20pt, weight: "bold", fill: theme-color("header_text"))[#payload.label 📊 玩家数据 · #payload.name]
]
#v(10pt)
#block(fill: theme-color("panel_fill"), stroke: 1pt + theme-color("panel_stroke"), radius: 4pt, inset: 12pt, width: 100%)[
  #grid(columns: (auto, 1fr), column-gutter: 12pt, row-gutter: 9pt,
    [#strong[玩家 ID]], [#text(size: 9pt)[#payload.xuid]],
    [#strong[历史游玩时间]], [#payload.total_play],
    [#strong[挖掘方块总数]], [#payload.blocks_mined],
    [#strong[击杀生物总数]], [#payload.mobs_killed],
    [#strong[进入次数]], [#payload.join_count],
  )
]
#v(8pt)
#align(center)[#text(size: 8pt, fill: theme-color("stats_text"))[首次记录 #payload.first_seen · 最后在线 #payload.last_seen]]
