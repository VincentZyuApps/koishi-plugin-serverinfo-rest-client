# koishi-plugin-ll-serverinfo-rest-client

[![npm](https://img.shields.io/npm/v/koishi-plugin-serverinfo-rest-client?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-serverinfo-rest-client)

对接 LeviLamina `serverinfo-rest` 服务端，提供服务器状态、历史玩家、玩家统计、远程命令和白名单绑定功能。

## 指令名称对照

默认指令前缀为 `mcinfo1`。中文名称是默认主指令，英文名称通过 alias 提供；修改 `commandPrefix` 后，两种名称的前缀会一起变化。

| 中文主名称 | 英文 alias | 默认完整指令 | 用途 |
| --- | --- | --- | --- |
| `健康检查` | `health` | `mcinfo1.健康检查` | 查询服务健康状态与运行时间 |
| `查在线` | `online` | `mcinfo1.查在线` | 查询 TPS、延迟、在线玩家与版本信息 |
| `历史记录` | `history` | `mcinfo1.历史记录 [页码]` | 分页查询历史玩家 |
| `查询数据` | `player-data` | `mcinfo1.查询数据 <玩家名>` | 查询指定玩家的历史统计 |
| `绑定白名单` | `bind-whitelist` | `mcinfo1.绑定白名单 <玩家名>` | 将当前聊天账号绑定到白名单 |
| `解绑` | `unbind` | `mcinfo1.解绑` | 解除当前聊天账号的普通绑定 |
| `添加白名单` | `add-whitelist` | `mcinfo1.添加白名单 <玩家名>` | 管理员直接添加白名单 |
| `移除白名单` | `remove-whitelist` | `mcinfo1.移除白名单 <玩家名>` | 管理员移除白名单与本地授权 |
| `执行命令` | `execute-command` | `mcinfo1.执行命令 <命令>` | 执行受权限控制的 BDS 命令 |
| `服务器状态` | `status` | `mcinfo1.服务器状态` | 查询简要服务器状态 |
| `服务器信息` | `server` | `mcinfo1.服务器信息` | 查询服务器详细信息 |
| `玩家列表` | `players` | `mcinfo1.玩家列表` | 查询在线玩家详情 |
| `玩家数量` | `players-count` | `mcinfo1.玩家数量` | 查询在线玩家数量 |
| `玩家名列表` | `players-names` | `mcinfo1.玩家名列表` | 查询在线玩家名列表 |
| `查询玩家` | `player` | `mcinfo1.查询玩家 <玩家名>` | 查询指定在线玩家 |

例如，`mcinfo1.健康检查` 与 `mcinfo1.health` 调用的是同一个功能。

## Typst 运行时模板

插件发布包中的 `templates/` 保存默认模板。启动时，默认模板会复制到 Koishi 根目录下的共享运行目录：

```text
data/assets/ll-serverinfo-rest-client/runtime/templates
```

- `mcinfo1`、`mcinfo2` 等多个插件实例共享同一个运行时模板目录。
- 插件每次出图都读取运行目录中的 `.typ` 文件，修改后下一次渲染即可生效。
- 启动同步只补充缺失文件，不覆盖用户已经修改的模板。
- 启动时会备份并自动修复曾导致字体和页面背景失效的旧版默认模板，但不会覆盖其他自定义模板。
- `typstTemplateFolderRelativePath` 在配置页标记为实验性只读项，用于查看相对于 `ctx.baseDir` 的路径片段。
- 直接修改运行时模板适合熟悉 Typst 的用户，普通使用不建议修改。

`typstTransparentBackground` 默认关闭，此时图片使用 `typstPageBgColor` 作为不透明背景；开启后输出 PNG 会保留透明背景。

插件详情页提供“恢复默认模板”按钮。恢复操作需要 Koishi authority 4，并在执行前进行二次确认。原目录会先完整备份为秒级时间戳目录，例如：

```text
data/assets/ll-serverinfo-rest-client/runtime/templates-backup-YYYYMMDD-HHmmss
```

恢复完成后会清理 Typst 编译缓存。备份不会自动删除，可在确认新模板工作正常后手动整理。

## 白名单语义

- `指令前缀.绑定白名单 <玩家名>` 将当前聊天账号与一个 Xbox 玩家名建立一对一绑定。默认只允许在群聊执行。
- `指令前缀.解绑` 只解除当前聊天账号的普通绑定，默认允许在群聊或私聊执行。
- `指令前缀.解绑` 不会撤销管理员通过 `添加白名单` 建立的直接授权；管理员授权只能由有权限的用户执行 `移除白名单 <玩家名>` 撤销。
- `添加白名单` 与 `移除白名单` 使用独立的 `whitelistManagementAdminList` 权限表，不依赖 Koishi authority。
- 绑定与授权数据仅保存在对应服务端插件的 `player-data.json`，Koishi 不建立数据库镜像。

相关配置：

- `whitelistBindGroupOnly`：绑定是否仅限群聊，默认 `true`。
- `whitelistUnbindGroupOnly`：解绑是否仅限群聊，默认 `false`。
- `whitelistBindingAuthority`：普通绑定和解绑所需的 Koishi 权限等级。
- `whitelistManagementAdminList`：管理员添加、移除白名单的独立权限名单。
