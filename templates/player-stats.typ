#import "common.typ": *
#set page(width: 520pt, height: auto, margin: 14pt, fill: theme-color("page_bg"))
#set text(font: text-fonts, size: 11pt, fill: theme-color("text"), lang: "zh")

#header(size: 20pt)[#payload.label 📈 玩家数据 · #payload.name]
#v(10pt)
#panel([
  #table(columns: (auto, 1fr), stroke: none, column-gutter: 12pt, row-gutter: 9pt,
    field-label([🪪 玩家 ID]), [#text(size: 9pt)[#payload.xuid]],
    field-label([⏱️ 历史游玩时间]), [#payload.total_play],
    field-label([⛏️ 挖掘方块总数]), [#payload.blocks_mined],
    field-label([⚔️ 击杀生物总数]), [#payload.mobs_killed],
    field-label([🚪 进入次数]), [#payload.join_count],
  )
])
#v(8pt)
#footer([🕒 首次记录 #payload.first_seen · 最后在线 #payload.last_seen])
