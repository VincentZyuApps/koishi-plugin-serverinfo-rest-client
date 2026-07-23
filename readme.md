![koishi-plugin-serverinfo-rest-client](https://socialify.git.ci/VincentZyuApps/koishi-plugin-serverinfo-rest-client/image?description=1&font=JetBrains+Mono&forks=1&issues=1&language=1&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png%3F_%3D20230331182243&name=1&owner=1&pulls=1&stargazers=1&theme=Auto)

# koishi-plugin-ll-serverinfo-rest-client

[![npm](https://img.shields.io/npm/v/koishi-plugin-ll-serverinfo-rest-client?style=flat-square&logo=npm)](https://www.npmjs.com/package/koishi-plugin-ll-serverinfo-rest-client)
[![npm downloads](https://img.shields.io/npm/dm/koishi-plugin-ll-serverinfo-rest-client?style=flat-square&logo=npm)](https://www.npmjs.com/package/koishi-plugin-ll-serverinfo-rest-client)

[![CI](https://github.com/VincentZyuApps/koishi-plugin-serverinfo-rest-client/actions/workflows/test.yml/badge.svg)](https://github.com/VincentZyuApps/koishi-plugin-serverinfo-rest-client/actions)

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/VincentZyuApps/koishi-plugin-serverinfo-rest-client)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=flat-square&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/koishi-plugin-ll-serverinfo-rest-client)

[![Koishi Market](https://img.shields.io/badge/Koishi-Market-5546A3?style=flat-square&logo=data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC&logoColor=white)](https://koishi.chat/zh-CN/market/)

[![QQ群](https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white)](https://qm.qq.com/q/ZN7fxZ3qCq)

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了）</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

对接 LeviLamina `serverinfo-rest` 服务端，提供服务器状态、历史玩家、玩家统计、远程命令和白名单绑定功能。

当前版本仅支持服务端 API v2，默认前缀为 `/api/v2`，不兼容 API v1。

> 配套 LeviLamina 服务端：[![LeviLamina Plugin](https://img.shields.io/badge/LeviLamina-Plugin-7FA973?style=flat-square&logo=cplusplus&logoColor=white&labelColor=2C5E3B)](https://github.com/VincentZyuApps/levilamina-plugin-serverinfo-rest) [`levilamina-plugin-serverinfo-rest`](https://github.com/VincentZyuApps/levilamina-plugin-serverinfo-rest)，负责在 Minecraft BDS 内提供本插件所需的 HTTP API。

## Token 发送方式

只读 token 和管理 token 可以分别选择发送位置。两个配置均使用单选框，支持以下三种值：

| 配置值 | 客户端行为 |
| --- | --- |
| `param` | 仅通过 URL query 参数 `?token=...` 发送 |
| `header` | 仅通过 `Authorization: Bearer ...` 请求头发送 |
| `both` | 在请求头和 URL 参数中同时发送相同 token |

| 客户端配置 | 默认值 | 对应服务端配置 |
| --- | --- | --- |
| `tokenSendMode` | `header` | `tokenReceiveMode`，服务端默认 `both` |
| `adminTokenSendMode` | `header` | `adminTokenReceiveMode`，服务端默认 `header` |

客户端默认使用更安全的 `header`。选择 `param` 或 `both` 后，插件会遮盖自身调试日志中的 token，但反向代理、浏览器或其他网络组件仍可能记录完整 URL，因此公网环境应配合 HTTPS 使用。

## 指令名称对照

默认主指令和功能指令前缀均为 `mcinfo1`。中文名称是默认主指令，英文名称通过 alias 提供；修改 `commandPrefix` 后，两种名称的前缀会一起变化。

`useCommandPrefix` 默认为 `true`。设为 `false` 后，单独的 `commandPrefix` 主指令仍会注册，例如 `mcinfo2`；功能指令则改为顶级的 `健康检查`、`health` 等名称，不再注册 `mcinfo2.健康检查`、`mcinfo2.health`。关闭前缀容易与其他插件或其他实例的同名顶级指令冲突，因此多实例场景建议保持开启；插件启动时也会输出冲突风险警告。

| 中文主名称 | 英文 alias | 默认完整指令 | 用途 |
| --- | --- | --- | --- |
| `健康检查` | `health` | `mcinfo1.健康检查` | 查询服务健康状态与运行时间 |
| `查在线` | `online` | `mcinfo1.查在线` | 查询 TPS、延迟、在线玩家与版本信息 |
| `历史记录` | `history` | `mcinfo1.历史记录 [页码]` | 分页查询历史玩家 |
| `玩家数据统计` | `player-stats` | `mcinfo1.玩家数据统计 [玩家名]` | 不传玩家名时查询当前账号绑定的玩家，也可查询指定玩家的累计统计 |
| `绑定玩家` | `bind-player` | `mcinfo1.绑定玩家 <玩家名>` | 绑定聊天账号与 Xbox 玩家；服务端启用 BDS allowlist 同步时同时更新进服名单 |
| `解绑玩家` | `unbind-player` | `mcinfo1.解绑玩家` | 解除唯一绑定；服务端启用同步时同时移除 BDS allowlist 项目 |
| `添加白名单` | `add-whitelist` | `mcinfo1.添加白名单 <玩家名> <聊天用户> [--force]` | 管理员通过艾特或 userId 代用户绑定；可强制替换冲突 |
| `查询白名单绑定` | `whitelist-binding` | `mcinfo1.查询白名单绑定 <玩家名>` | 管理员查询玩家绑定状态，用户 ID 默认脱敏 |
| `移除白名单` | `remove-whitelist` | `mcinfo1.移除白名单 <玩家名>` | 管理员移除唯一绑定；服务端启用同步时同时移除 BDS allowlist 项目 |
| `执行命令` | `execute-command` | `mcinfo1.执行命令 <命令>` | 执行受权限控制的 BDS 命令 |
| `服务器状态` | `server-status` | `mcinfo1.服务器状态` | 查询简要服务器状态 |
| `服务器信息` | `server` | `mcinfo1.服务器信息` | 查询服务器详细信息 |
| `玩家列表` | `players` | `mcinfo1.玩家列表` | 查询在线玩家详情 |
| `玩家数量` | `players-count` | `mcinfo1.玩家数量` | 查询在线玩家数量 |
| `玩家名列表` | `players-names` | `mcinfo1.玩家名列表` | 查询在线玩家名列表 |
| `玩家在线详情` | `online-player` | `mcinfo1.玩家在线详情 <玩家名>` | 查询指定在线玩家的实时身份、状态、环境、装备和网络质量 |

例如，`mcinfo1.健康检查` 与 `mcinfo1.health` 调用的是同一个功能。

关闭 `useCommandPrefix` 后，对应写法为 `健康检查` 与 `health`，而 `mcinfo1` 仍可用于查看本插件的指令帮助。

## 玩家在线详情字段

`玩家在线详情 <玩家名>` 调用服务端 `GET /api/v2/player?name=<玩家名>`。服务端在 BDS 主线程每秒刷新一次玩家快照，Koishi 的文字与 Typst 图片输出共用 `playerFieldFilters` 过滤结果。

- 身份、权限、游戏模式、生命值、动作状态、维度、环境、升级所需经验和网络质量默认显示。
- 精确坐标同时受 `hidePlayerCoordinates` 总开关和对应字段开关控制；维度信息不受坐标隐藏影响。
- 主手、副手、盔甲、设备平台和输入方式受支持，但默认关闭显示。
- IP、客户端 ID 和服务器地址不会由 API 返回，不能通过字段配置开启。
- API v2 使用 `isOperator`、`locale`、`position` 等规范键；旧 `isOP`、`langCode`、`pos` 等 `serverinfo-rest-js` 配置键不会迁移或生效。

## Typst 运行时模板

插件发布包中的 `templates/` 保存默认模板。启动时，默认模板会复制到 Koishi 根目录下的共享运行目录：

```text
data/assets/ll-serverinfo-rest-client/runtime/templates
```

- `mcinfo1`、`mcinfo2` 等多个插件实例共享同一个运行时模板目录。
- 插件每次出图都读取运行目录中的 `.typ` 文件，修改后下一次渲染即可生效。
- 启动同步只补充缺失文件，不覆盖用户已经修改的模板。
- 启动时会备份并自动修复曾导致字体和页面背景失效的旧版默认模板，但不会覆盖其他自定义模板。
- 升级到新版玩家快照结构时，旧 `player-detail.typ` 会单独备份为 `player-detail.typ.backup-YYYYMMDD-HHmmss`，再替换为兼容 API v2 的模板。
- `typstTemplateFolderRelativePath` 在配置页标记为实验性只读项，用于查看相对于 `ctx.baseDir` 的路径片段。
- 直接修改运行时模板适合熟悉 Typst 的用户，普通使用不建议修改。

`typstTransparentBackground` 默认关闭，此时图片使用 `typstPageBgColor` 作为不透明背景；开启后输出 PNG 会保留透明背景。

插件详情页提供“恢复默认模板”按钮。恢复操作需要 Koishi authority 4，并在执行前进行二次确认。原目录会先完整备份为秒级时间戳目录，例如：

```text
data/assets/ll-serverinfo-rest-client/runtime/templates-backup-YYYYMMDD-HHmmss
```

恢复完成后会清理 Typst 编译缓存。备份不会自动删除，可在确认新模板工作正常后手动整理。

## 白名单语义

- `绑定玩家 <玩家名>` 将当前聊天账号与一个 Xbox 玩家名建立一对一绑定，供无参数历史统计查询识别当前玩家；开启功能指令前缀时使用 `指令前缀.绑定玩家 <玩家名>`。默认只允许在群聊执行。
- 服务端启用 `syncBindingsToBdsAllowlist` 时，`绑定玩家` 同时更新 BDS allowlist；关闭同步时只保存账号关系，仍可用于自动查询自己的数据。
- `解绑玩家` 解除当前聊天账号的唯一绑定；仅在服务端启用 BDS allowlist 同步时才同时移除名单项目。开启功能指令前缀时使用 `指令前缀.解绑玩家`，默认允许在群聊或私聊执行。
- API v2 只有“已绑定”和“未绑定”两种状态。一个聊天账号只能绑定一个 Xbox 玩家，一个 Xbox 玩家也只能绑定一个聊天账号。
- `添加白名单 <玩家名> <聊天用户>` 由管理员为当前聊天平台、当前 Bot 下的目标用户创建同一种绑定；目标可使用艾特或纯 userId。
- 发生用户侧或玩家侧绑定冲突时默认拒绝并返回 `409`；管理员显式使用 `--force` 后会同时替换全部冲突，并在服务端启用同步时移除失去绑定的旧玩家 BDS allowlist 项目。
- `添加白名单`、`查询白名单绑定` 与 `移除白名单` 使用独立的 `whitelistManagementAdminList` 权限表，不依赖 Koishi authority。
- 绑定数据仅保存在对应服务端插件的 `player-data.json`，Koishi 不建立数据库镜像。
- `玩家数据统计` 不传玩家名时会使用当前聊天账号的绑定；未绑定时会提示先绑定或显式传入玩家名。
- `玩家数据统计 <玩家名>` 保持公开查询行为，不要求当前聊天账号绑定到该玩家。

相关配置：

- `whitelistBindGroupOnly`：绑定是否仅限群聊，默认 `true`。
- `whitelistUnbindGroupOnly`：解绑玩家是否仅限群聊，默认 `false`。
- `whitelistBindingAuthority`：绑定玩家和解绑玩家所需的 Koishi 权限等级。
- `whitelistManagementAdminList`：管理员添加、移除白名单的独立权限名单。
