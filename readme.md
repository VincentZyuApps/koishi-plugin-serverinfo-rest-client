# koishi-plugin-ll-serverinfo-rest-client

[![npm](https://img.shields.io/npm/v/koishi-plugin-serverinfo-rest-client?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-serverinfo-rest-client)

对接 LeviLamina `serverinfo-rest` 服务端，提供服务器状态、历史玩家、玩家统计、远程命令和白名单绑定功能。

## 白名单语义

- `指令前缀.绑定白名单 <玩家名>` 将当前聊天账号与一个 Xbox 玩家名建立一对一绑定。默认只允许在群聊执行。
- `指令前缀.解绑` 只解除当前聊天账号的普通绑定，默认允许在群聊或私聊执行。
- `/解绑` 不会撤销管理员通过 `添加白名单` 建立的直接授权；管理员授权只能由有权限的用户执行 `移除白名单 <玩家名>` 撤销。
- `添加白名单` 与 `移除白名单` 使用独立的 `whitelistManagementAdminList` 权限表，不依赖 Koishi authority。
- 绑定与授权数据仅保存在对应服务端插件的 `player-data.json`，Koishi 不建立数据库镜像。

相关配置：

- `whitelistBindGroupOnly`：绑定是否仅限群聊，默认 `true`。
- `whitelistUnbindGroupOnly`：解绑是否仅限群聊，默认 `false`。
- `whitelistBindingAuthority`：普通绑定和解绑所需的 Koishi 权限等级。
- `whitelistManagementAdminList`：管理员添加、移除白名单的独立权限名单。
