#let payload = json.decode(bytes(sys.inputs.at("payload")))
#let theme = payload.theme

#let theme-color(name) = rgb(theme.at(name))
#let text-fonts = (
  theme.at("font_family"),
  "Noto Color Emoji",
  "Noto Sans CJK SC",
  "Microsoft YaHei",
)

#let header(body, size: 16pt) = block(
  fill: theme-color("header_fill"),
  stroke: 2pt + theme-color("header_stroke"),
  radius: 6pt,
  inset: 10pt,
  width: 100%,
  align(center, text(size: size, weight: "bold", fill: theme-color("header_text"), body)),
)

#let panel(body, inset: 12pt) = block(
  fill: theme-color("panel_fill"),
  stroke: 1pt + theme-color("panel_stroke"),
  radius: 4pt,
  inset: inset,
  width: 100%,
  body,
)

#let field-label(body) = text(weight: "bold", fill: theme-color("section_title"), body)

#let footer(body) = align(
  center,
  text(size: 8pt, fill: theme-color("stats_text"), body),
)
