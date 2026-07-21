#import "common.typ": *
#set page(width: 430pt, height: auto, margin: 14pt, fill: theme-color("page_bg"))
#set text(font: text-fonts, size: 11pt, fill: theme-color("text"), lang: "zh")
#let position-row = if payload.position == none {
  ()
} else {
  (field-label([📍 位置]), [#payload.position])
}

#header([#payload.label 👤 玩家 · #payload.name])
#v(8pt)
#panel([
  #table(
    columns: (auto, 1fr),
    stroke: none,
    row-gutter: 7pt,
    field-label([🪪 XUID]), [#text(size: 9pt)[#payload.xuid]],
    field-label([🆔 UUID]), [#text(size: 9pt)[#payload.uuid]],
    field-label([🌐 语言]), [#payload.locale],
    field-label([🛡️ OP]), [#payload.operator],
    ..position-row,
  )
])
