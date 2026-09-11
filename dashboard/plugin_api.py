"""连接器面板 — 后端 API。

挂载于 /api/plugins/connectors-panel/，聚合三类连接器的实时状态：
  - MCP 工具连接器（config.yaml 的 mcp_servers）
  - 消息平台（gateway_state.json）
  - 技能集成（~/.hermes/skills/ 按分类分组）
"""

import json
import os
import re
from pathlib import Path

from fastapi import APIRouter

import yaml

router = APIRouter()

HERMES_HOME = Path(os.environ.get("HERMES_HOME", str(Path.home() / "AppData" / "Local" / "hermes")))
CONFIG_FILE = HERMES_HOME / "config.yaml"
GATEWAY_STATE = HERMES_HOME / "gateway_state.json"
SKILLS_DIR = HERMES_HOME / "skills"

# 技能名 → 连接器归类（含"连接"属性的技能）
CONNECTOR_SKILLS = {
    "dingtalk": ("钉钉", "dingtalk-"),
    "github": ("GitHub", "github"),
    "feishu": ("飞书", "lark"),
    "yida": ("宜搭", "yida"),
    "google": ("Google Workspace", "google-workspace"),
    "notion": ("Notion", "notion"),
    "obsidian": ("Obsidian", "obsidian"),
    "email": ("邮箱", "himalaya"),
    "airtable": ("Airtable", "airtable"),
    "box": ("Box", "box"),
    "ssh": ("SSH 远程", "ssh"),
    "wechat": ("微信", "weixin"),
    "xiaohongshu": ("小红书", "xiaohongshu"),
    "douyin": ("抖音", "douyin"),
    "yuanbao": ("元宝", "yuanbao"),
}

# MCP 连接器描述
MCP_DESCRIPTIONS = {
    "chrome-devtools": "浏览器自动化（CDP）",
    "trends-hub": "21 平台热榜聚合（微博/知乎/抖音等）",
    "office-word": "Word 文档读写编辑（19 工具）",
    "office-excel": "Excel 表格读写编辑（45 工具）",
    "matrixmedia": "多平台内容分发（掘金/微信等）",
    "douyin": "抖音创作者平台（登录/发布/管理）",
}

PLATFORM_NAMES = {
    "weixin": "微信",
    "feishu": "飞书",
    "telegram": "Telegram",
    "discord": "Discord",
    "slack": "Slack",
    "whatsapp": "WhatsApp",
}


def _load_config():
    try:
        return yaml.safe_load(CONFIG_FILE.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}


@router.get("/all")
async def connectors_all():
    """返回全部连接器的分类状态。"""
    config = _load_config()

    # 1. MCP 连接器
    mcp = []
    mcp_servers = (config.get("mcp_servers") or {})
    for name, cfg in mcp_servers.items():
        cfg = cfg or {}
        enabled = cfg.get("enabled", True)
        mcp.append({
            "name": name,
            "description": MCP_DESCRIPTIONS.get(name, ""),
            "transport": cfg.get("transport") or ("stdio"),
            "enabled": bool(enabled),
            "status": "ready" if enabled else "disabled",
        })

    # 2. 消息平台
    platforms = []
    try:
        state = json.loads(GATEWAY_STATE.read_text(encoding="utf-8"))
        for name, info in (state.get("platforms") or {}).items():
            platforms.append({
                "name": name,
                "label": PLATFORM_NAMES.get(name, name),
                "state": (info or {}).get("state", "unknown"),
            })
    except Exception:
        pass

    # 3. 技能集成（按连接器分组）
    skill_groups = []
    try:
        installed = {}
        for d in sorted(SKILLS_DIR.iterdir()):
            if not d.is_dir():
                continue
            skill_md = d / "SKILL.md"
            if not skill_md.exists():
                continue
            try:
                head = skill_md.read_text(encoding="utf-8")[:800]
            except Exception:
                head = ""
            m = re.search(r"description:\s*(.+)", head)
            installed[d.name] = (m.group(1).strip().strip('"\'') if m else "")

        matched = set()
        for key, (label, prefix) in CONNECTOR_SKILLS.items():
            items = []
            for name, desc in installed.items():
                nl = name.lower()
                if nl.startswith(prefix) or prefix in nl:
                    items.append({"name": name, "description": desc})
                    matched.add(name)
            if items:
                skill_groups.append({"connector": label, "skills": items, "count": len(items)})
        # 其余独立技能归入"其他"
        others = [
            {"name": n, "description": d}
            for n, d in installed.items()
            if n not in matched
        ]
        if others:
            skill_groups.append({"connector": "其他技能", "skills": others[:50], "count": len(others)})
    except Exception:
        pass

    totals = {
        "mcp": len(mcp),
        "platforms": len(platforms),
        "skill_groups": sum(1 for g in skill_groups if g["connector"] != "其他技能"),
        "skills": sum(g["count"] for g in skill_groups),
    }

    return {
        "mcp": mcp,
        "platforms": platforms,
        "skill_groups": skill_groups,
        "totals": totals,
    }
