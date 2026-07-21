#import "common.typ": *
#set page(width: 420pt, height: auto, margin: 14pt, fill: theme-color("page_bg"))
#set text(font: text-fonts, size: 11pt, fill: theme-color("text"), lang: "zh")

#header([#payload.label 🖥️ 服务器信息])
#v(8pt)
#panel([
  #table(
    columns: (auto, 1fr),
    stroke: none,
    row-gutter: 7pt,
    field-label([📊 状态]), [#payload.status],
    field-label([🌍 存档]), [#payload.level_name],
    field-label([👥 在线玩家]), [#payload.online_players / #payload.max_players],
    field-label([🎮 BDS]), [#payload.bds_version],
    field-label([📡 协议版本]), [#payload.protocol_version],
    field-label([⚙️ LeviLamina]), [#payload.levilamina_version],
    field-label([🔌 插件]), [#payload.plugin_version],
  )
])
