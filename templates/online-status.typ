#import "common.typ": *
#set page(width: 540pt, height: auto, margin: 16pt, fill: page-fill)
#set text(font: text-fonts, size: 11pt, fill: theme-color("text"), lang: "zh")

#if not payload.online {
  block(fill: rgb("#8f3b46"), radius: 6pt, inset: 14pt, width: 100%)[
    #align(center)[#text(size: 22pt, weight: "bold", fill: white)[#payload.label 🌐 服务器离线]]
  ]
  v(10pt)
  block(fill: theme-color("panel_fill"), stroke: 1pt + theme-color("panel_stroke"), radius: 4pt, inset: 14pt, width: 100%)[
    #text(size: 13pt, weight: "bold", fill: rgb("#8f3b46"))[无法连接服务器]
    #v(8pt)
    #text[#payload.error]
    #v(8pt)
    #text(size: 9pt, fill: theme-color("stats_text"))[查询耗时 #payload.latency_ms ms · #payload.checked_at]
  ]
} else {
  block(fill: theme-color("header_fill"), stroke: 2pt + theme-color("header_stroke"), radius: 6pt, inset: 14pt, width: 100%)[
    #grid(columns: (1fr, auto), align: (left, right),
      [#text(size: 22pt, weight: "bold", fill: theme-color("header_text"))[#payload.label 🌐 在线状态]],
      [#text(size: 13pt, weight: "bold", fill: theme-color("header_text"))[在线 #payload.online_players / #payload.max_players]],
    )
  ]
  v(10pt)
  block(fill: theme-color("panel_fill"), stroke: 1pt + theme-color("panel_stroke"), radius: 4pt, inset: 12pt, width: 100%)[
    #text(size: 12pt, weight: "bold", fill: theme-color("section_title"))[TPS 运行状态]
    #v(8pt)
    #grid(columns: (1fr, 1fr, 1fr, 1fr), gutter: 7pt,
      [#align(center)[#text(size: 16pt, weight: "bold", fill: rgb(payload.tps_color))[#payload.tps.realtime] #linebreak() #text(size: 8pt)[实时 1s]]],
      [#align(center)[#text(size: 22pt, weight: "bold", fill: rgb(payload.tps_color))[#payload.tps.avg10s] #linebreak() #text(size: 8pt)[短期 10s]]],
      [#align(center)[#text(size: 28pt, weight: "bold", fill: rgb(payload.tps_color))[#payload.tps.avg60s] #linebreak() #text(size: 8pt)[中期 60s]]],
      [#align(center)[#text(size: 36pt, weight: "bold", fill: rgb(payload.tps_color))[#payload.tps.avg300s] #linebreak() #text(size: 8pt)[长期 300s]]],
    )
  ]
  v(8pt)
  block(fill: theme-color("panel_fill"), stroke: 1pt + theme-color("panel_stroke"), radius: 4pt, inset: 12pt, width: 100%)[
    #grid(columns: (auto, 1fr, auto, 1fr), column-gutter: 8pt, row-gutter: 7pt,
      [#text(weight: "bold", fill: theme-color("section_title"))[BDS]], [#payload.versions.bds],
      [#text(weight: "bold", fill: theme-color("section_title"))[协议]], [#payload.versions.protocol],
      [#text(weight: "bold", fill: theme-color("section_title"))[LeviLamina]], [#payload.versions.levilamina],
      [#text(weight: "bold", fill: theme-color("section_title"))[插件]], [#payload.versions.plugin],
    )
  ]
  v(8pt)
  align(center)[#text(size: 8pt, fill: theme-color("stats_text"))[延迟 #payload.latency_ms ms · TPS 已采样 #payload.tps.sampled_seconds s · #payload.checked_at]]
}
