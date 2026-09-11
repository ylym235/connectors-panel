/**
 * 连接器面板 — Hermes 桌面应用插件
 * 复用 dashboard 版后端：/api/plugins/connectors-panel/all
 * 展示 MCP 工具、消息平台、技能集成三类连接器的实时状态
 */

import {
  Badge,
  Button,
  cn,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  PALETTE_AREA,
  StatusDot,
  useQuery,
  host
} from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'

const ID = 'connectors-panel'

const PLATFORM_NAMES = {
  weixin: '微信',
  feishu: '飞书',
  telegram: 'Telegram',
  discord: 'Discord',
  slack: 'Slack',
  whatsapp: 'WhatsApp'
}

function statusTone(state) {
  if (state === 'connected' || state === 'ready') return 'good'
  if (state === 'disabled') return 'warn'
  if (state === 'error') return 'bad'
  return 'muted'
}

function StatCard(props) {
  return jsxs('div', {
    className: 'flex items-center gap-3 rounded-lg border border-(--ui-stroke-secondary) p-3',
    children: [
      jsx('span', { className: 'text-2xl', children: props.icon }),
      jsxs('div', {
        children: [
          jsx('div', { className: 'text-xl font-semibold text-(--ui-text-primary)', children: props.value }),
          jsx('div', { className: 'text-[0.6875rem] text-(--ui-text-tertiary)', children: props.label })
        ]
      })
    ]
  })
}

function ConnectorRow(props) {
  return jsxs('div', {
    className: cn(
      'flex items-center justify-between rounded-md border border-(--ui-stroke-secondary) px-3 py-2',
      !props.enabled && 'opacity-50'
    ),
    children: [
      jsxs('div', { className: 'flex items-center gap-2 min-w-0', children: [
        jsx(StatusDot, { tone: statusTone(props.state) }),
        jsx('span', { className: 'text-sm font-medium text-(--ui-text-primary)', children: props.name }),
        props.sub
          ? jsx('span', { className: 'text-[0.6875rem] text-(--ui-text-quaternary)', children: props.sub })
          : null
      ]}),
      jsxs('div', { className: 'flex items-center gap-2 shrink-0', children: [
        props.desc
          ? jsx('span', {
              className: 'hidden text-[0.6875rem] text-(--ui-text-tertiary) xl:inline',
              title: props.desc,
              children: props.desc.length > 26 ? props.desc.slice(0, 26) + '…' : props.desc
            })
          : null,
        jsx(Badge, { variant: 'outline', children: props.badge })
      ]})
    ]
  })
}

function Section(props) {
  return jsxs('div', { className: 'flex flex-col gap-2', children: [
    jsxs('div', { className: 'flex items-center gap-2', children: [
      jsx('span', { children: props.icon }),
      jsx('span', { className: 'text-sm font-semibold text-(--ui-text-primary)', children: props.title }),
      jsx(Badge, { variant: 'secondary', children: props.count + ' 项' })
    ]}),
    jsx('div', { className: 'flex flex-col gap-1.5', children: props.children })
  ]})
}

function ConnectorsPage() {
  const query = useQuery({
    queryKey: ['connectors-panel', 'all'],
    queryFn: () => ctxRef.rest('/all'),
    refetchInterval: 30000
  })

  if (query.isLoading) {
    return jsx('div', {
      className: 'p-8 text-center text-(--ui-text-tertiary)',
      children: '加载连接器状态…'
    })
  }
  if (query.isError) {
    return jsxs('div', { className: 'flex flex-col items-center gap-3 p-8', children: [
      jsx('div', { className: 'text-(--ui-text-tertiary)', children: '加载失败：' + String(query.error) }),
      jsx(Button, { onClick: () => query.refetch(), children: '重试' })
    ]})
  }

  const data = query.data
  if (!data) return null
  const t = data.totals

  return jsxs('div', { className: 'flex h-full flex-col gap-5 overflow-y-auto p-4', children: [
    // 头部
    jsxs('div', { className: 'flex items-center justify-between', children: [
      jsxs('div', { children: [
        jsx('div', { className: 'text-base font-semibold text-(--ui-text-primary)', children: '🔌 连接器面板' }),
        jsx('div', { className: 'text-[0.6875rem] text-(--ui-text-tertiary)', children: 'MCP 工具 · 消息平台 · 技能集成 — 实时状态' })
      ]}),
      jsx(Button, { variant: 'outline', size: 'sm', onClick: () => query.refetch(), children: '🔄 刷新' })
    ]}),

    // 概览统计
    jsx('div', { className: 'grid grid-cols-2 gap-3 lg:grid-cols-4', children: [
      jsx(StatCard, { icon: '🔌', label: 'MCP 工具', value: t.mcp }),
      jsx(StatCard, { icon: '💬', label: '消息平台', value: t.platforms }),
      jsx(StatCard, { icon: '🧩', label: '技能集成', value: t.skill_groups }),
      jsx(StatCard, { icon: '📚', label: '技能总数', value: t.skills })
    ]}),

    // 消息平台
    jsx(Section, {
      icon: '💬', title: '消息平台', count: data.platforms.length,
      children: data.platforms.length === 0
        ? jsx('div', { className: 'text-sm text-(--ui-text-tertiary)', children: '暂无已连接平台' })
        : data.platforms.map(p => jsx(ConnectorRow, {
            key: p.name,
            name: p.label,
            sub: p.name,
            state: p.state,
            badge: p.state === 'connected' ? '已连接' : p.state,
            enabled: true
          }))
    }),

    // MCP
    jsx(Section, {
      icon: '🔌', title: 'MCP 工具连接器', count: data.mcp.length,
      children: data.mcp.map(m => jsx(ConnectorRow, {
        key: m.name,
        name: m.name,
        sub: m.transport,
        desc: m.description,
        state: m.status,
        badge: m.enabled ? '已启用' : '已停用',
        enabled: m.enabled
      }))
    }),

    // 技能集成
    jsx(Section, {
      icon: '🧩', title: '技能集成', count: data.skill_groups.length,
      children: data.skill_groups.map(g => jsxs('div', {
        className: 'rounded-md border border-(--ui-stroke-secondary) px-3 py-2',
        children: [
          jsxs('div', { className: 'mb-1.5 flex items-center justify-between', children: [
            jsx('span', { className: 'text-sm font-medium text-(--ui-text-primary)', children: g.connector }),
            jsx(Badge, { variant: 'secondary', children: g.count + ' 个技能' })
          ]}),
          g.connector === '其他技能'
            ? jsx('div', { className: 'text-[0.6875rem] text-(--ui-text-tertiary)',
                children: '其余 ' + g.count + ' 个独立技能（工具类、开发类、文档类等）' })
            : jsx('div', { className: 'flex flex-wrap gap-1', children:
                g.skills.slice(0, 10).map(s => jsx('span', {
                  className: 'rounded border border-(--ui-stroke-secondary) bg-(--ui-surface-secondary) px-1.5 py-0.5 text-[0.6875rem] text-(--ui-text-secondary)',
                  title: s.description,
                  children: s.name
                })) })
        ]
      }))
    })
  ]})
}

let ctxRef = null

export default {
  id: ID,
  name: '连接器面板',
  register(ctx) {
    ctxRef = ctx

    // 完整页面
    ctx.register({
      id: 'page',
      area: ROUTES_AREA,
      data: { path: '/connectors' },
      render: () => jsx(ConnectorsPage, {})
    })

    // 侧边栏导航
    ctx.register({
      id: 'nav',
      area: SIDEBAR_NAV_AREA,
      data: { path: '/connectors', label: '连接器', codicon: 'plug' }
    })

    // 命令面板
    ctx.register({
      id: 'command',
      area: PALETTE_AREA,
      data: {
        title: '连接器面板',
        keywords: ['连接器', 'connectors', 'mcp', '插件'],
        run: () => host.navigate('/connectors')
      }
    })
  }
}
