#import "common.typ": *
#set page(width: 430pt, height: auto, margin: 14pt, fill: page-fill)
#set text(font: text-fonts, size: 11pt, fill: theme-color("text"), lang: "zh")
#let position-row = if payload.position == none { () } else { ([位置], [#payload.position]) }

#block(fill: theme-color("header_fill"), stroke: 2pt + theme-color("header_stroke"), radius: 6pt, inset: 10pt, width: 100%)[
  #align(center)[#text(size: 16pt, weight: "bold", fill: theme-color("header_text"))[#payload.label 👤 玩家 · #payload.name]]
]
#v(8pt)
#block(fill: theme-color("panel_fill"), stroke: 1pt + theme-color("panel_stroke"), radius: 4pt, inset: 12pt, width: 100%)[
  #table(
    columns: (auto, 1fr),
    stroke: none,
    row-gutter: 7pt,
    [XUID], [#text(size: 9pt)[#payload.xuid]],
    [UUID], [#text(size: 9pt)[#payload.uuid]],
    [语言], [#payload.locale],
    [OP], [#payload.operator],
    ..position-row,
  )
]
