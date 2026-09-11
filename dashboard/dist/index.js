/**
 * 连接器面板 — Hermes dashboard 插件
 * 统一展示：MCP 工具连接器、消息平台、技能集成
 */
(function () {
  "use strict";

  const SDK = window.__HERMES_PLUGIN_SDK__;
  if (!SDK) return;
  const { React } = SDK;
  const { Card, CardHeader, CardTitle, CardContent, Badge, Button } = SDK.components;
  const { useState, useEffect } = SDK.hooks;
  const h = React.createElement;

  const STATUS_COLORS = {
    connected: "#4ade80",
    ready: "#4ade80",
    disabled: "#fbbf24",
    error: "#f87171",
    unknown: "#94a3b8",
  };

  function dot(status) {
    const c = STATUS_COLORS[status] || "#94a3b8";
    return h("span", {
      style: {
        display: "inline-block",
        width: 8, height: 8, borderRadius: "50%",
        background: c, boxShadow: "0 0 6px " + c,
      },
    });
  }

  function statCard(icon, label, value) {
    return h(Card, null,
      h(CardContent, { className: "py-4 flex items-center gap-3" },
        h("span", { className: "text-2xl" }, icon),
        h("div", null,
          h("div", { className: "text-2xl font-bold" }, value),
          h("div", { className: "text-xs text-muted-foreground" }, label))));
  }

  function ConnectorsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    function load() {
      setLoading(true);
      setError(null);
      SDK.fetchJSON("/api/plugins/connectors-panel/all")
        .then(function (d) { setData(d); })
        .catch(function (e) { setError(String(e)); })
        .finally(function () { setLoading(false); });
    }

    useEffect(function () { load(); }, []);

    if (loading) {
      return h("div", { className: "p-8 text-center text-muted-foreground" }, "加载连接器状态…");
    }
    if (error) {
      return h(Card, null,
        h(CardContent, { className: "py-6" },
          h("p", { className: "text-sm text-destructive" }, "加载失败：" + error),
          h(Button, { onClick: load, className: "mt-3" }, "重试")));
    }
    if (!data) return null;

    const t = data.totals;

    // ── 消息平台 ──
    const platformRows = data.platforms.map(function (p) {
      return h("div", {
        key: p.name,
        className: "flex items-center justify-between border border-border p-3 rounded",
      },
        h("div", { className: "flex items-center gap-2" },
          dot(p.state),
          h("span", { className: "font-medium" }, p.label),
          h("span", { className: "text-xs text-muted-foreground" }, p.name)),
        h(Badge, { variant: p.state === "connected" ? "outline" : "secondary" },
          p.state === "connected" ? "已连接" : p.state));
    });

    // ── MCP 连接器 ──
    const mcpCards = data.mcp.map(function (m) {
      return h("div", {
        key: m.name,
        className: "border border-border p-3 rounded" + (m.enabled ? "" : " opacity-50"),
      },
        h("div", { className: "flex items-center justify-between" },
          h("div", { className: "flex items-center gap-2" },
            dot(m.status),
            h("span", { className: "font-medium text-sm" }, m.name)),
          h(Badge, { variant: "outline" }, m.transport)),
        m.description
          ? h("p", { className: "text-xs text-muted-foreground mt-1" }, m.description)
          : null);
    });

    // ── 技能集成 ──
    const skillGroups = data.skill_groups.map(function (g) {
      let body;
      if (g.connector === "其他技能") {
        body = h("p", { className: "text-xs text-muted-foreground" },
          "其余 " + g.count + " 个独立技能（工具类、开发类、文档类等）");
      } else {
        const chips = g.skills.slice(0, 8).map(function (s) {
          return h("span", {
            key: s.name,
            title: s.description,
            className: "text-[11px] px-1.5 py-0.5 border border-border rounded bg-background/40 text-muted-foreground",
          }, s.name);
        });
        if (g.count > 8) {
          chips.push(h("span", { key: "more", className: "text-[11px] text-muted-foreground" }, "+" + (g.count - 8)));
        }
        body = h("div", { className: "flex flex-wrap gap-1" }, chips);
      }
      return h("div", { key: g.connector, className: "border border-border p-3 rounded" },
        h("div", { className: "flex items-center justify-between mb-2" },
          h("span", { className: "font-medium" }, g.connector),
          h(Badge, { variant: "secondary" }, g.count + " 个技能")),
        body);
    });

    return h("div", { className: "flex flex-col gap-6" },
      // 概览统计
      h("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },
        statCard("🔌", "MCP 工具", t.mcp),
        statCard("💬", "消息平台", t.platforms),
        statCard("🧩", "技能集成", t.skill_groups),
        statCard("📚", "技能总数", t.skills)),

      // 消息平台
      h(Card, null,
        h(CardHeader, null,
          h(CardTitle, { className: "text-base" }, "💬 消息平台"),
          h(Badge, { variant: "outline" }, data.platforms.length + " 项")),
        h(CardContent, null,
          data.platforms.length === 0
            ? h("p", { className: "text-sm text-muted-foreground" }, "暂无已连接平台")
            : h("div", { className: "grid gap-2" }, platformRows))),

      // MCP
      h(Card, null,
        h(CardHeader, null,
          h(CardTitle, { className: "text-base" }, "🔌 MCP 工具连接器"),
          h(Badge, { variant: "outline" }, data.mcp.length + " 项")),
        h(CardContent, null,
          h("div", { className: "grid gap-2 md:grid-cols-2" }, mcpCards))),

      // 技能
      h(Card, null,
        h(CardHeader, null,
          h(CardTitle, { className: "text-base" }, "🧩 技能集成"),
          h(Badge, { variant: "outline" }, data.skill_groups.length + " 组")),
        h(CardContent, null,
          h("div", { className: "grid gap-4 md:grid-cols-2" }, skillGroups))),

      h("div", { className: "flex justify-end" },
        h(Button, { onClick: load }, "🔄 刷新状态")));
  }

  window.__HERMES_PLUGINS__.register("connectors-panel", ConnectorsPage);
})();
