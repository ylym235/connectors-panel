# 连接器面板 · Connectors Panel

统一管理并实时展示 Hermes 的三类连接器状态：**MCP 工具**、**消息平台**、**技能集成**。同时提供 Web Dashboard 标签页和桌面端原生页面两种形态。

One panel to see all your Hermes connectors live: **MCP tools**, **messaging platforms**, and **skill integrations**. Ships as a unified package with both a Web-dashboard tab and a native desktop page.

## 功能 Features

- 📡 **MCP 工具连接器** — 读取 `config.yaml` 的 `mcp_servers`，显示每个 MCP 服务器状态
- 💬 **消息平台** — 从 `gateway_state.json` 聚合微信/飞书/Telegram/Discord/Slack/WhatsApp 等的连接状态
- 🧩 **技能集成** — 扫描 `~/.hermes/skills/`，按钉钉、GitHub、飞书、宜搭等归类展示
- 🟢 实时状态点（good/warn/bad/muted）+ 统计卡片
- 双形态：Web Dashboard `/connectors` 标签页 + 桌面侧边栏「连接器」导航页

## 这是什么形态 What ships

这是一个**统一包**（unified package）——一个文件夹同时装下：

```
connectors-panel/
├── desktop/plugin.js        # 桌面原生半边：侧边栏导航 + 路由 + 命令面板
├── dashboard/
│   ├── manifest.json        # Web dashboard 清单（tab → /connectors）
│   ├── plugin_api.py        # 后端：聚合三类连接器状态 → /api/plugins/connectors-panel/
│   └── dist/index.js        # Web dashboard 半边 UI
├── README.md
└── LICENSE
```

桌面半边通过 `ctx.rest('/all')` 调用坐在它旁边的 `plugin_api.py`。

## 安装 Install

**一键安装链接：**

<a href="hermes://plugin/install?repo=ylym235/connectors-panel&enable=1">Install in Hermes</a>

**手动安装：** 把整个文件夹放入 `~/.hermes/plugins/connectors-panel/`（统一包目录，不是 desktop-plugins）。

**两道开关都要打开**（统一包默认 off）：

1. **后端**：在 `config.yaml` 的 `plugins.enabled` 加入 `connectors-panel`，重启 gateway（后端路由在启动时挂载）
2. **桌面半边**：Capabilities → Plugins 里手动启用 `connectors-panel`（opt-in）

后端没开时，桌面页 `ctx.rest` 返回错误而非崩溃（graceful degrade）。

## 已知限制 Known limitations

- `ctx.rest` 在 OAuth 远程后端下是 no-op；远程场景请用 Web Dashboard 形态，或加轮询兜底
- 后端路由在 gateway 启动时挂载，改完 `plugin_api.py` 需重启 gateway（不是热重载）
- 依赖 `config.yaml` / `gateway_state.json` / `skills/` 的本地文件系统，远程后端读不到

## License

MIT
