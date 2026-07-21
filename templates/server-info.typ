#import "common.typ": *
#set page(width: 420pt, height: auto, margin: 14pt, fill: page-fill)
#set text(font: text-fonts, size: 11pt, fill: theme-color("text"), lang: "zh")

#block(fill: theme-color("header_fill"), stroke: 2pt + theme-color("header_stroke"), radius: 6pt, inset: 10pt, width: 100%)[
  #align(center)[#text(size: 16pt, weight: "bold", fill: theme-color("header_text"))[#payload.label 🖥️ 服务器信息]]
]
#v(8pt)
#block(fill: theme-color("panel_fill"), stroke: 1pt + theme-color("panel_stroke"), radius: 4pt, inset: 12pt, width: 100%)[
  #table(
    columns: (auto, 1fr),
    stroke: none,
    row-gutter: 7pt,
    [状态], [#payload.status],
    [存档], [#payload.level_name],
    [在线玩家], [#payload.online_players / #payload.max_players],
    [BDS], [#payload.bds_version],
    [协议版本], [#payload.protocol_version],
    [LeviLamina], [#payload.levilamina_version],
    [插件], [#payload.plugin_version],
  )
]
