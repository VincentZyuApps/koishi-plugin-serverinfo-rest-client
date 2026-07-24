const pkg = require('../package.json')

const KOISHI_LOGO_BASE64 = 'data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC'

export const usage = `
<h1>🎮 Minecraft BDS 服务器信息查询</h1>
<p><strong>当前版本：v${pkg.version}</strong></p>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-ll-serverinfo-rest-client" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-ll-serverinfo-rest-client?style=flat-square&logo=npm" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/koishi-plugin-ll-serverinfo-rest-client" target="_blank">
    <img src="https://img.shields.io/npm/dm/koishi-plugin-ll-serverinfo-rest-client?style=flat-square&logo=npm" alt="npm downloads">
  </a>
  <br>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-serverinfo-rest-client/actions" target="_blank">
    <img src="https://github.com/VincentZyuApps/koishi-plugin-serverinfo-rest-client/actions/workflows/test.yml/badge.svg" alt="CI">
  </a>
  <br>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-serverinfo-rest-client" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-ll-serverinfo-rest-client" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=flat-square&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <br>
  <a href="https://koishi.chat/zh-CN/market/" target="_blank">
    <img src="https://img.shields.io/badge/Koishi-Market-5546A3?style=flat-square&logo=${KOISHI_LOGO_BASE64}&logoColor=white" alt="Koishi Market">
  </a>
  <br>

  <br>
  <a href="https://qm.qq.com/q/ZN7fxZ3qCq" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="QQ群">
  </a>
  <br>
</p>

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了）</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

<p>通过 LeviLamina <code>serverinfo-rest</code> HTTP 服务查询 Minecraft 基岩版服务器，支持服务器状态、TPS、在线与历史玩家、白名单管理和受控命令执行。</p>

<ul>
  <li>📊 支持文字、Typst 图片与 QQ Markdown 输出。</li>
  <li>👥 中文主指令和英文 alias 可同时使用，并支持多个服务器实例。</li>
  <li>🧩 Typst 在本地完成渲染，不依赖额外的在线渲染服务。</li>
</ul>

<p><strong>使用前请先安装并启动服务端 <code>serverinfo-rest</code> 插件，再正确填写 <code>serverUrl</code>、<code>token</code> 和 <code>adminToken</code>。</strong></p>

<details>
<summary><strong>🚀 快速接入与连接配置（点击展开）</strong></summary>

<ol>
  <li>确认 BDS、LeviLamina 和 <code>serverinfo-rest</code> 已启动，健康检查接口可以访问。</li>
  <li>将 <code>serverUrl</code> 填为 HTTP 服务地址，例如 <code>http://127.0.0.1:60202</code>。</li>
  <li>保持 <code>apiPrefix</code> 与服务端一致，API v2 默认是 <code>/api/v2</code>；本版本不兼容 API v1。</li>
  <li>如服务端启用了只读认证，请填写 <code>token</code>；需要白名单或命令管理时还要填写 <code>adminToken</code>。</li>
  <li><code>tokenSendMode</code> 和 <code>adminTokenSendMode</code> 分别控制两种令牌的发送位置，默认都使用 <code>header</code>。</li>
  <li>按需修改 <code>commandPrefix</code>、<code>useCommandPrefix</code> 和 <code>serverLabel</code>；多个插件实例可以分别使用 <code>mcinfo1</code>、<code>mcinfo2</code>。</li>
</ol>

<p>Koishi 与 BDS 不在同一台机器时，请确认服务端监听地址、防火墙和局域网路由允许 Koishi 访问对应端口。管理令牌请只填写在可信环境中，不要发送到群聊或公开日志。</p>
</details>

<details>
<summary><strong>📝 完整指令与英文 alias（点击展开）</strong></summary>

<p>默认主指令和功能指令前缀均为 <code>mcinfo1</code>。中文名称是主指令，英文名称是等价 alias；修改 <code>commandPrefix</code> 后两者会一起变化。</p>
<p><code>useCommandPrefix</code> 默认为 <code>true</code>。关闭后仍会保留单独的 <code>commandPrefix</code> 主指令，但功能指令会注册为顶级的 <code>健康检查</code>、<code>health-check</code> 等名称，不再注册 <code>mcinfo1.健康检查</code> 等带前缀形式。顶级名称可能与其他插件或其他实例冲突，多实例场景建议保持开启。</p>

<table>
  <thead>
    <tr><th>中文主指令</th><th>英文 alias</th><th>用途</th></tr>
  </thead>
  <tbody>
    <tr><td><code>mcinfo1.按钮菜单 [页码]</code></td><td><code>mcinfo1.button-menu [页码]</code></td><td>QQ 平台两页按钮菜单，页码默认为 1</td></tr>
    <tr><td><code>mcinfo1.健康检查</code></td><td><code>mcinfo1.health-check</code></td><td>服务健康状态与运行时间</td></tr>
    <tr><td><code>mcinfo1.查在线</code></td><td><code>mcinfo1.server-overview</code></td><td>TPS、延迟、在线玩家和版本概览</td></tr>
    <tr><td><code>mcinfo1.历史记录 [页码]</code></td><td><code>mcinfo1.player-history [页码]</code></td><td>分页查询历史玩家</td></tr>
    <tr><td><code>mcinfo1.玩家数据统计 [玩家名]</code></td><td><code>mcinfo1.player-stats [玩家名]</code></td><td>默认查询当前账号绑定的玩家，也可查询指定玩家的累计统计</td></tr>
    <tr><td><code>mcinfo1.绑定玩家 &lt;玩家名&gt;</code></td><td><code>mcinfo1.bind-player &lt;玩家名&gt;</code></td><td>绑定聊天账号与 Xbox 玩家；服务端启用 BDS allowlist 同步时同时更新进服名单</td></tr>
    <tr><td><code>mcinfo1.解绑玩家</code></td><td><code>mcinfo1.unbind-player</code></td><td>解除当前账号的唯一绑定；服务端启用同步时同时移除 BDS allowlist 项目</td></tr>
    <tr><td><code>mcinfo1.添加白名单 &lt;玩家名&gt; &lt;聊天用户&gt; [--force]</code></td><td><code>mcinfo1.add-whitelist &lt;玩家名&gt; &lt;聊天用户&gt; [--force]</code></td><td>管理员通过艾特或 userId 代用户创建绑定；<code>--force</code> 会替换双方冲突绑定</td></tr>
    <tr><td><code>mcinfo1.查询白名单绑定 &lt;玩家名&gt;</code></td><td><code>mcinfo1.whitelist-binding &lt;玩家名&gt;</code></td><td>管理员查询玩家是否已绑定，用户 ID 默认脱敏显示</td></tr>
    <tr><td><code>mcinfo1.移除白名单 &lt;玩家名&gt;</code></td><td><code>mcinfo1.remove-whitelist &lt;玩家名&gt;</code></td><td>管理员移除唯一绑定；服务端启用同步时同时移除 BDS allowlist 项目</td></tr>
    <tr><td><code>mcinfo1.执行命令 &lt;命令&gt;</code></td><td><code>mcinfo1.execute-command &lt;命令&gt;</code></td><td>执行受权限控制的 BDS 命令</td></tr>
    <tr><td><code>mcinfo1.服务器状态</code></td><td><code>mcinfo1.server-status</code></td><td>查询简要服务器状态</td></tr>
    <tr><td><code>mcinfo1.服务器信息</code></td><td><code>mcinfo1.server-details</code></td><td>查询服务器详细信息</td></tr>
    <tr><td><code>mcinfo1.玩家列表</code></td><td><code>mcinfo1.player-list</code></td><td>查询在线玩家详细资料</td></tr>
    <tr><td><code>mcinfo1.玩家数量</code></td><td><code>mcinfo1.player-count</code></td><td>查询在线玩家数量</td></tr>
    <tr><td><code>mcinfo1.玩家名列表</code></td><td><code>mcinfo1.player-names</code></td><td>只查询在线玩家名列表</td></tr>
    <tr><td><code>mcinfo1.玩家在线详情 &lt;玩家名&gt;</code></td><td><code>mcinfo1.player-details &lt;玩家名&gt;</code></td><td>查询实时身份、状态、环境、装备和网络质量</td></tr>
  </tbody>
</table>

<p>查询类指令可通过 <code>--mode text</code> 或 <code>--mode image</code> 临时指定输出形式。</p>
<p>关闭 <code>useCommandPrefix</code> 后，表中的中文主指令和英文 alias 均去掉 <code>mcinfo1.</code>，单独的 <code>mcinfo1</code> 仍可查看本插件帮助。</p>
<p><code>按钮菜单 [页码]</code> 仅支持 <code>qq</code> 平台，并由 <code>qqKeyboardEnabled</code> 独立控制；关闭查询结果的 QQ Markdown 输出不会禁用按钮菜单。第 1 页以两列四行展示八个服务器与概览入口，第 2 页以两列三行展示六个玩家与账号入口，四条管理员指令不会出现在菜单中。</p>
<p>两页底部始终保留上一页和下一页；边界红叉按钮仍可点击，并会提示已经位于第一页或最后一页。绑定玩家、玩家在线详情和解绑玩家按钮只填入指令而不自动发送。</p>
<p><code>qqMarkdownEnabled</code> 只控制查询结果自动使用 QQ Markdown 与公网图片，<code>qqKeyboardEnabled</code> 独立控制“查在线”键盘和“按钮菜单”指令。</p>
<p>启用 <code>verboseConsoleLog</code> 后会输出 API 摘要、QQ 图片缓存路径和完整临时公网 URL。API token 会被隐藏，但图片 URL 在缓存有效期内可直接访问，请勿公开生产日志。</p>
</details>

<details>
<summary><strong>🔐 Token、权限与白名单说明（点击展开）</strong></summary>

<ul>
  <li><code>token</code> 是只读访问令牌，用于状态、玩家和历史数据等查询接口。</li>
  <li><code>adminToken</code> 是独立的高权限令牌，用于绑定玩家、解绑玩家、添加白名单、移除白名单和服务端命令接口。</li>
  <li><code>param</code> 通过 URL 参数发送，<code>header</code> 通过 Bearer 请求头发送，<code>both</code> 同时使用两种形式。</li>
  <li>客户端两个发送模式默认都是 <code>header</code>；服务端只读接收模式默认 <code>both</code>，管理接收模式默认 <code>header</code>。</li>
  <li>选择 <code>param</code> 或 <code>both</code> 时 token 会进入 URL，公网环境应使用 HTTPS，并留意代理和访问日志。</li>
  <li>两个令牌应设置为不同的随机值；即使配置了 <code>adminToken</code>，服务端仍可通过自身配置关闭远程命令执行。</li>
  <li>绑定玩家和解绑玩家受 <code>whitelistBindingAuthority</code> 以及群聊限制配置控制。</li>
  <li>管理员白名单操作与命令执行分别使用 <code>whitelistManagementAdminList</code> 和 <code>commandExecutionAdminList</code>，两份权限表相互独立。</li>
</ul>

<p>API v2 只有“已绑定”和“未绑定”两种状态，不再区分普通绑定与管理员直接授权。每个聊天账号和 Xbox 玩家都只能出现在一条绑定中。</p>
</details>

<details>
<summary><strong>🎨 输出模式、字体与 Typst 模板（点击展开）</strong></summary>

<ul>
  <li><code>defaultOutputModes</code> 可选择文字和 Typst 图片，并允许同时发送多种输出。</li>
  <li>首次启动时可自动从 Release 下载并校验霞鹜文楷 Mono 与 Emoji 字体。</li>
  <li><code>typstTransparentBackground</code> 默认关闭；开启后 PNG 保留透明背景。</li>
  <li>主题色、正文色、面板色和渲染倍率均可在插件配置页调整。</li>
  <li>默认模板会复制到 <code>data/assets/ll-serverinfo-rest-client/runtime/templates</code>，多个插件实例共享该目录。</li>
  <li>启动时只补充缺失模板，不覆盖用户修改；配置页的“恢复默认模板”会先创建秒级时间戳备份，再执行覆盖。</li>
</ul>

<p>直接编辑运行目录中的 <code>.typ</code> 文件适合熟悉 Typst 的用户。模板修改会影响后续出图，建议修改前自行备份，或通过插件详情页恢复默认模板。</p>
</details>

<hr>
<p>项目地址：<a href="https://github.com/VincentZyuApps/koishi-plugin-serverinfo-rest-client" target="_blank">GitHub</a> · <a href="https://gitee.com/vincent-zyu/koishi-plugin-ll-serverinfo-rest-client" target="_blank">Gitee</a></p>
`
