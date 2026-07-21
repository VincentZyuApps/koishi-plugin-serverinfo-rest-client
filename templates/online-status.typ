#import "common.typ": *
#set page(width: 540pt, height: auto, margin: 14pt, fill: theme-color("page_bg"))
#set text(font: text-fonts, size: 11pt, fill: theme-color("text"), lang: "zh")

#if not payload.online {
  block(fill: rgb("#8f3b46"), radius: 6pt, inset: 14pt, width: 100%)[
    #align(center)[#text(size: 22pt, weight: "bold", fill: white)[#payload.label 📡 服务器离线]]
  ]
  v(10pt)
  panel([
    #text(size: 13pt, weight: "bold", fill: rgb("#8f3b46"))[❌ 无法连接服务器]
    #v(8pt)
    #text[#payload.error]
    #v(8pt)
    #text(size: 9pt, fill: theme-color("stats_text"))[⏱️ 查询耗时 #payload.latency_ms ms · #payload.checked_at]
  ])
} else {
  header(size: 22pt)[#payload.label 📡 在线状态 · 👥 #payload.online_players / #payload.max_players]
  v(10pt)
  panel([
    #text(size: 12pt, weight: "bold", fill: theme-color("section_title"))[📈 TPS 运行状态]
    #v(8pt)
    #grid(columns: (1fr, 1fr, 1fr, 1fr), gutter: 7pt,
      align(center)[#text(size: 16pt, weight: "bold", fill: rgb(payload.tps_color))[#payload.tps.realtime] #linebreak() #text(size: 8pt)[实时 1s]],
      align(center)[#text(size: 22pt, weight: "bold", fill: rgb(payload.tps_color))[#payload.tps.avg10s] #linebreak() #text(size: 8pt)[短期 10s]],
      align(center)[#text(size: 28pt, weight: "bold", fill: rgb(payload.tps_color))[#payload.tps.avg60s] #linebreak() #text(size: 8pt)[中期 60s]],
      align(center)[#text(size: 36pt, weight: "bold", fill: rgb(payload.tps_color))[#payload.tps.avg300s] #linebreak() #text(size: 8pt)[长期 300s]],
    )
  ])
  v(8pt)
  panel([
    #table(columns: (auto, 1fr, auto, 1fr), stroke: none, column-gutter: 8pt, row-gutter: 7pt,
      field-label([🎮 BDS]), [#payload.versions.bds],
      field-label([📡 协议]), [#payload.versions.protocol],
      field-label([⚙️ LeviLamina]), [#payload.versions.levilamina],
      field-label([🔌 插件]), [#payload.versions.plugin],
    )
  ])
  v(8pt)
  footer([⏱️ 延迟 #payload.latency_ms ms · TPS 已采样 #payload.tps.sampled_seconds 秒 · #payload.checked_at])
}
