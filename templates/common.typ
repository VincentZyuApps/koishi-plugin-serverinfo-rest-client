#let payload = json.decode(bytes(sys.inputs.at("payload")))
#let theme = payload.theme

#let theme-color(name) = rgb(theme.at(name))
#let page-fill = if theme.transparent_background { none } else { theme-color("page_bg") }
#let text-fonts = (
  theme.font_family,
  "Noto Color Emoji",
  "Noto Sans CJK SC",
  "Microsoft YaHei",
)
