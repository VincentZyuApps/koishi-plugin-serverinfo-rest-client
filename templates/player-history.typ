#import "common.typ": *
#set page(width: 620pt, height: auto, margin: 14pt, fill: theme-color("page_bg"))
#set text(font: text-fonts, size: 10pt, fill: theme-color("text"), lang: "zh")

#header(size: 20pt)[#payload.label 📚 历史玩家 · 共 #payload.total 人]
#v(10pt)
#panel(inset: 10pt)[
  #grid(columns: (34pt, 1.2fr, 1fr, 1.25fr), column-gutter: 6pt,
    field-label([序号]), field-label([玩家]), field-label([累计游玩]), field-label([最后在线]),
  )
  #v(6pt)
  #if payload.players.len() == 0 {
    align(center, [暂无历史玩家])
  } else {
    for player in payload.players {
      grid(columns: (34pt, 1.2fr, 1fr, 1.25fr), column-gutter: 6pt,
        [#player.number], [👤 #player.name], [⏱️ #player.total_play], [🕒 #player.last_seen],
      )
      v(6pt)
    }
  }
]
#v(7pt)
#footer([第 #payload.page / #payload.page_count 页 · 数据从统计功能启用后开始累计])
