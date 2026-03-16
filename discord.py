import os
import json
import asyncio
import re
import base64
from urllib.parse import quote_plus, quote
import aiohttp
import discord
from discord import app_commands
from discord.ext import commands
import upstash_redis
from flask import Flask, send_file
from threading import Thread
import time
import csv
from io import StringIO
from datetime import datetime
from typing import Optional

# ----------------------
# 保活
# ----------------------
app = Flask('')

@app.route('/')
def home():
    return "Bot running"

@app.route('/api/record_key_usage', methods=['POST'])
def record_key_usage():
    """
    网站在密钥验证成功时调用此接口上报user_agent信息

    请求体JSON格式：
    {
        "uid": "Discord用户ID",
        "key": "密钥",
        "user_agent": "浏览器user_agent",
        "ip": "用户IP地址（可选）"
    }
    """
    try:
        from flask import request, jsonify

        data = request.get_json()
        if not data:
            return jsonify({"error": "无效的JSON数据"}), 400

        uid = str(data.get("uid", ""))
        key = str(data.get("key", ""))
        user_agent = str(data.get("user_agent", ""))
        ip = str(data.get("ip", ""))

        if not uid or not key or not user_agent:
            return jsonify({"error": "缺少必要字段: uid, key, user_agent"}), 400

        # 调用记录函数处理
        record_claim_history(uid, key, user_agent)

        # 异步检测可疑账号
        suspicious = detect_suspicious_account(uid)
        if suspicious["is_suspicious"]:
            print(f"🚨 可疑账号检测（网站密钥验证）: UID {uid}")
            for reason in suspicious.get('reasons', []):
                print(f"   → {reason}")

        return jsonify({
            "success": True,
            "is_suspicious": suspicious["is_suspicious"],
            "reasons": suspicious.get("reasons", [])
        }), 200

    except Exception as e:
        print(f"❌ 记录密钥使用失败: {e}")
        return jsonify({"error": f"服务器错误: {str(e)[:100]}"}), 500

def run():
    app.run(host='0.0.0.0', port=8080)

def keep_alive():
    t = Thread(target=run)
    t.daemon = True
    t.start()

def heartbeat():
    while True:
        time.sleep(60)
        try:
            redis.ping()
        except:
            pass

# ----------------------
# 机器人配置
# ----------------------
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
bot = commands.Bot(command_prefix="!", intents=intents)

# ----------------------
# Redis
# ----------------------
redis = upstash_redis.Redis(
    url=os.getenv("UPSTASH_REDIS_URL"),
    token=os.getenv("UPSTASH_REDIS_TOKEN")
)

# ----------------------
# AI 聊天与答疑配置
# ----------------------
AI_ENABLED = os.getenv("AI_ENABLED", "true").lower() in ("1", "true", "yes", "y", "on")
AI_API_KEY = os.getenv("AI_API_KEY", "sk-MOnP80FpoxBaL9JfJxnOOulCPQ8AHtzSG4kqHkPEKq96uEg3").strip()
AI_API_BASE = os.getenv("AI_API_BASE", "https://kfc-api.sxxe.net/v1").rstrip("/")
AI_MODEL = os.getenv("AI_MODEL", "gpt-5.2-codex-high").strip()
AI_VISION_MODEL = os.getenv("AI_VISION_MODEL", "").strip() or AI_MODEL
AI_TEMPERATURE = float(os.getenv("AI_TEMPERATURE", "0.7"))
AI_MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", "600"))
AI_MAX_IMAGE_COUNT = int(os.getenv("AI_MAX_IMAGE_COUNT", "3"))
AI_MAX_INPUT_CHARS = int(os.getenv("AI_MAX_INPUT_CHARS", "1500"))
AI_MAX_CONTEXT_MESSAGES = int(os.getenv("AI_MAX_CONTEXT_MESSAGES", "8"))
AI_CONTEXT_TTL_SEC = int(os.getenv("AI_CONTEXT_TTL_SEC", "3600"))
AI_CHANNEL_CONTEXT_MESSAGES = int(os.getenv("AI_CHANNEL_CONTEXT_MESSAGES", "6"))
AI_CHANNEL_CONTEXT_MAX_CHARS = int(os.getenv("AI_CHANNEL_CONTEXT_MAX_CHARS", "160"))
AI_REPLY_COOLDOWN_SEC = float(os.getenv("AI_REPLY_COOLDOWN_SEC", "0"))
AI_MAX_CONCURRENCY = max(1, int(os.getenv("AI_MAX_CONCURRENCY", "3")))
AI_STREAMING_ENABLED = os.getenv("AI_STREAMING_ENABLED", "true").lower() in ("1", "true", "yes", "y", "on")
AI_STREAMING_UPDATE_INTERVAL_SEC = float(os.getenv("AI_STREAMING_UPDATE_INTERVAL_SEC", "1.2"))
AI_STREAMING_MIN_CHARS = int(os.getenv("AI_STREAMING_MIN_CHARS", "30"))
AI_API_RETRY_MAX = max(0, int(os.getenv("AI_API_RETRY_MAX", "2")))
AI_API_RETRY_BACKOFF_SEC = float(os.getenv("AI_API_RETRY_BACKOFF_SEC", "1.5"))
AI_QA_MAX_ITERATIONS = max(1, int(os.getenv("AI_QA_MAX_ITERATIONS", "2")))
AI_ERROR_NOTICE_COOLDOWN_SEC = float(os.getenv("AI_ERROR_NOTICE_COOLDOWN_SEC", "20"))
AI_CHANNEL_ALLOWLIST = os.getenv(
    "AI_CHANNEL_ALLOWLIST",
    "1480955486823125195,1472481240778281012,1473738786356855059"
).strip()
AI_CHANNEL_BLOCKLIST = os.getenv("AI_CHANNEL_BLOCKLIST", "").strip()
AI_QA_CHANNEL_ID = "1473738786356855059"
AI_CHAT_CHANNEL_ID = "1480955486823125195"
AI_KEY_HELP_CHANNEL_ID = "1472481240778281012"
AI_NAME = "小喵1号"
AI_REPO_READ_ENABLED = os.getenv("AI_REPO_READ_ENABLED", "true").lower() in ("1", "true", "yes", "y", "on")
AI_REPO_URL = os.getenv("AI_REPO_URL", "https://github.com/lolidoll/ovo").strip().rstrip("/")
AI_REPO_BRANCH = os.getenv("AI_REPO_BRANCH", "main").strip()
AI_REPO_MAX_FILES = int(os.getenv("AI_REPO_MAX_FILES", "300"))
AI_REPO_MAX_FILE_BYTES = int(os.getenv("AI_REPO_MAX_FILE_BYTES", "80000"))
AI_REPO_SCAN_MAX_FILES = int(os.getenv("AI_REPO_SCAN_MAX_FILES", "800"))
AI_REPO_DEEP_SCAN_MAX_FILES = int(os.getenv("AI_REPO_DEEP_SCAN_MAX_FILES", "24000"))
AI_REPO_SCAN_CONCURRENCY = max(1, int(os.getenv("AI_REPO_SCAN_CONCURRENCY", "16")))
AI_REPO_SCAN_MAX_SECONDS = float(os.getenv("AI_REPO_SCAN_MAX_SECONDS", "45"))
AI_REPO_DEEP_SCAN_MAX_SECONDS = float(os.getenv("AI_REPO_DEEP_SCAN_MAX_SECONDS", "380"))
AI_REPO_CONTENT_CACHE_TTL_SEC = int(os.getenv("AI_REPO_CONTENT_CACHE_TTL_SEC", "900"))
AI_REPO_SEARCH_MAX_QUERIES = int(os.getenv("AI_REPO_SEARCH_MAX_QUERIES", "5"))
AI_REPO_RAW_URL_ENABLED = os.getenv("AI_REPO_RAW_URL_ENABLED", "true").lower() in ("1", "true", "yes", "y", "on")
AI_REPO_FORCE_DEEP_SCAN = os.getenv("AI_REPO_FORCE_DEEP_SCAN", "true").lower() in ("1", "true", "yes", "y", "on")
AI_REPO_MAX_SNIPPET_LINES = int(os.getenv("AI_REPO_MAX_SNIPPET_LINES", "40"))
AI_REPO_MAX_SNIPPET_CHARS = int(os.getenv("AI_REPO_MAX_SNIPPET_CHARS", "2000"))
AI_REPO_CACHE_TTL_SEC = int(os.getenv("AI_REPO_CACHE_TTL_SEC", "0"))
AI_REPO_TIMEOUT_SEC = float(os.getenv("AI_REPO_TIMEOUT_SEC", "12"))
AI_GITHUB_TOKEN = os.getenv("AI_GITHUB_TOKEN", os.getenv("GITHUB_TOKEN", "")).strip()
AI_GITHUB_SEARCH_ALLOW_NO_TOKEN = os.getenv("AI_GITHUB_SEARCH_ALLOW_NO_TOKEN", "true").lower() in ("1", "true", "yes", "y", "on")

# ----------------------
# 身份组答题配置
# ----------------------
FISH_ROLE_NAME = "小鱼干"
FISH_QUIZ_QUESTION = (
    "是否仔细阅读、充分理解并自愿接受以下全部条款，承诺严格遵守，共同维护尊重创作、友善包容的社区环境：\n"
    "1. 未经原作者授权，不擅自二传、二改原创作品及用于商业用途；\n"
    "2. 交流中尊重友善、理性包容，营造平等互助氛围；\n"
    "3. 拒绝网络暴力、人身攻击、恶意嘲讽、造谣排挤等行为；\n"
    "4. 产生分歧优先理性沟通，矛盾不寻求管理员调解；\n"
    "5. 积极点赞、评论、回复，正向支持创作者；\n"
    "6. 反馈秉持建设性，拒绝无意义负面评价与人身攻击；\n"
    "7. 抵制恶意催更、过度索取，尊重创作者劳动与节奏。"
)
FISH_QUIZ_EXPECTED_ANSWER = (
    "我已仔细阅读、充分理解并自愿接受以下全部条款，承诺严格遵守，共同维护尊重创作、友善包容的社区环境"
)
FISH_QUIZ_PANEL_CHANNEL_ID = os.getenv("FISH_QUIZ_PANEL_CHANNEL_ID", "1482556244870037504").strip()

# ----------------------
# 工单管理器
# ----------------------
class TicketManager:
    """处理工单的自动关闭逻辑"""

    @staticmethod
    def get_ticket_key(channel_id):
        """获取工单的Redis键"""
        return f"ticket:{channel_id}"

    @staticmethod
    async def set_ticket_info(channel_id, member_id, ticket_type="support"):
        """设置工单信息"""
        ticket_key = TicketManager.get_ticket_key(channel_id)
        redis.set(ticket_key, json.dumps({
            "member_id": str(member_id),
            "type": ticket_type,
            "created_at": datetime.now().isoformat(),
            "claimed_by": None,
            "status": "open"
        }), ex=86400)  # 24小时过期

    @staticmethod
    def get_ticket_info(channel_id):
        """获取工单信息"""
        ticket_key = TicketManager.get_ticket_key(channel_id)
        info = redis.get(ticket_key)
        if info:
            if isinstance(info, bytes):
                info = info.decode('utf-8')
            return json.loads(info)
        return None



    @staticmethod
    async def schedule_autoclose(channel, delay_minutes=10):
        """计划工单自动关闭"""
        await asyncio.sleep(delay_minutes * 60)

        try:
            # 检查频道是否仍然存在
            if not channel:
                return

            # 获取频道消息，检查是否有成员发送的消息
            msg_count = 0
            async for message in channel.history(limit=100):
                # 只计算不是bot發送的消息，排除初始embed
                if not message.author.bot:
                    msg_count += 1

            # 如果10分钟内没有用户消息，自动关闭
            if msg_count == 0:
                embed = discord.Embed(
                    title="⏰ 工单自动关闭",
                    description="由于10分钟内没有新消息，工单已自动关闭。\n\n后续可重新提交。",
                    color=0xff6b6b
                )
                try:
                    await channel.send(embed=embed)
                    await asyncio.sleep(3)
                except:
                    pass

                # 删除频道
                try:
                    await channel.delete(reason="工单10分钟无消息，自动关闭")
                    print(f"✅ 工单 {channel.name} 已自动关闭")
                except:
                    pass
        except Exception as e:
            print(f"❌ 工单自动关闭出错: {e}")

# ----------------------
# 保护附件管理器
# ----------------------
class ProtectedAttachmentManager:
    """处理论坛帖子保护附件的上传、下载和验证逻辑"""

    @staticmethod
    def get_attachment_key(thread_id):
        """获取帖子附件的Redis键"""
        return f"protected_attachment:{thread_id}"

    @staticmethod
    def get_user_access_key(thread_id, user_id):
        """获取用户访问记录的Redis键"""
        return f"attachment_access:{thread_id}:{user_id}"

    @staticmethod
    async def save_attachments(thread_id, owner_id, attachments_data):
        """
        保存保护附件信息
        attachments_data: [{"name": "显示名称", "filename": "文件名", "url": "附件URL", "size": 大小}]
        """
        data = {
            "thread_id": str(thread_id),
            "owner_id": str(owner_id),
            "attachments": attachments_data,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "download_count": 0
        }
        key = ProtectedAttachmentManager.get_attachment_key(thread_id)
        redis.set(key, json.dumps(data))  # 长期存储，不过期
        return True

    @staticmethod
    def get_attachments(thread_id):
        """获取帖子的保护附件信息"""
        key = ProtectedAttachmentManager.get_attachment_key(thread_id)
        data = redis.get(key)
        if data:
            if isinstance(data, bytes):
                data = data.decode('utf-8')
            return json.loads(data)
        return None

    @staticmethod
    async def update_attachments(thread_id, new_attachments_data):
        """更新附件内容"""
        existing = ProtectedAttachmentManager.get_attachments(thread_id)
        if not existing:
            return False

        existing["attachments"] = new_attachments_data
        existing["updated_at"] = datetime.now().isoformat()

        key = ProtectedAttachmentManager.get_attachment_key(thread_id)
        redis.set(key, json.dumps(existing))  # 长期存储
        return True

    @staticmethod
    def increment_download_count(thread_id):
        """增加下载计数"""
        existing = ProtectedAttachmentManager.get_attachments(thread_id)
        if existing:
            existing["download_count"] = existing.get("download_count", 0) + 1
            key = ProtectedAttachmentManager.get_attachment_key(thread_id)
            redis.set(key, json.dumps(existing))  # 长期存储

    @staticmethod
    def record_user_access(thread_id, user_id):
        """记录用户已获取访问权限"""
        key = ProtectedAttachmentManager.get_user_access_key(thread_id, user_id)
        redis.set(key, json.dumps({
            "accessed_at": datetime.now().isoformat(),
            "downloads": 1
        }))  # 长期存储

    @staticmethod
    def has_user_access(thread_id, user_id):
        """检查用户是否已有访问权限"""
        key = ProtectedAttachmentManager.get_user_access_key(thread_id, user_id)
        return redis.get(key) is not None

    @staticmethod
    async def check_user_engagement(thread: discord.Thread, user: discord.Member):
        """
        检查用户是否满足下载条件：点赞帖子 + 评论帖子
        返回: {"liked": bool, "commented": bool, "passed": bool}
        """
        result = {"liked": False, "commented": False, "passed": False}

        try:
            # 检查是否在帖子中发送过消息（评论）
            async for message in thread.history(limit=200):
                if message.author.id == user.id and not message.author.bot:
                    result["commented"] = True
                    break

            # 检查是否点赞了帖子的首条消息
            # 注：Discord论坛帖子的"点赞"通常是通过reaction实现
            starter_message = thread.starter_message
            if not starter_message:
                # 尝试获取帖子首条消息
                async for msg in thread.history(limit=1, oldest_first=True):
                    starter_message = msg
                    break

            if starter_message:
                for reaction in starter_message.reactions:
                    async for reactor in reaction.users():
                        if reactor.id == user.id:
                            result["liked"] = True
                            break
                    if result["liked"]:
                        break

            result["passed"] = result["liked"] and result["commented"]

        except Exception as e:
            print(f"❌ 检查用户互动状态失败: {e}")

        return result

# ----------------------
# 帖子置底消息管理器
# ----------------------
class ThreadBottomManager:
    """处理论坛帖子置底消息（保护附件下载入口、公告）"""

    @staticmethod
    def get_notice_key(thread_id, notice_type):
        return f"thread:bottom_notice:{thread_id}:{notice_type}"

    @staticmethod
    def get_notice(thread_id, notice_type):
        key = ThreadBottomManager.get_notice_key(thread_id, notice_type)
        raw = redis.get(key)
        if not raw:
            return None
        try:
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            if isinstance(raw, str):
                raw = json.loads(raw)
            return raw if isinstance(raw, dict) else None
        except Exception:
            return None

    @staticmethod
    def set_notice(thread_id, notice_type, data):
        key = ThreadBottomManager.get_notice_key(thread_id, notice_type)
        redis.set(key, json.dumps(data, ensure_ascii=False))

    @staticmethod
    def delete_notice(thread_id, notice_type):
        key = ThreadBottomManager.get_notice_key(thread_id, notice_type)
        redis.delete(key)


def _now_text():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _can_manage_thread_bottom(interaction: discord.Interaction, thread: discord.Thread):
    return thread.owner_id == interaction.user.id or interaction.user.guild_permissions.administrator


def _is_announcement_bottom_channel(channel):
    if isinstance(channel, discord.Thread):
        return True
    if isinstance(channel, discord.TextChannel):
        return channel.type in (discord.ChannelType.text, discord.ChannelType.news)
    return False


def _can_manage_announcement_bottom(interaction: discord.Interaction, channel):
    if isinstance(channel, discord.Thread):
        return _can_manage_thread_bottom(interaction, channel)
    if isinstance(channel, discord.TextChannel):
        perms = channel.permissions_for(interaction.user)
        return (
            interaction.user.guild_permissions.administrator
            or perms.manage_channels
            or perms.manage_messages
        )
    return False


async def _delete_thread_message_if_exists(channel, message_id):
    if not message_id:
        return
    try:
        msg = await channel.fetch_message(int(message_id))
        await msg.delete()
    except (discord.NotFound, discord.Forbidden):
        pass
    except Exception as e:
        print(f"⚠️ 删除旧置底消息失败: {e}")


def _build_attachment_bottom_embed(thread: discord.Thread):
    attachment_data = ProtectedAttachmentManager.get_attachments(thread.id)
    if not attachment_data:
        return None

    count = len(attachment_data.get("attachments", []))
    embed = discord.Embed(
        title="📥 保护附件下载入口（置底）",
        description=(
            "本帖包含保护附件，下载前需完成互动验证。\n"
            "请先完成条件，再使用 `/领取保护附件`。"
        ),
        color=0x3498db
    )
    embed.add_field(
        name="✅ 下载条件",
        value=(
            "1. 对帖子首条消息添加任意表情反应（点赞）\n"
            "2. 在帖子中发送任意评论\n"
            "3. 使用 `/领取保护附件` 下载"
        ),
        inline=False
    )
    embed.add_field(
        name="📎 当前附件",
        value=f"共 **{count}** 个保护附件",
        inline=False
    )
    embed.set_footer(text=f"帖子ID: {thread.id} | 自动置底更新时间: {_now_text()}")
    return embed


def _build_announcement_bottom_embed(channel, content: str):
    embed = discord.Embed(
        title="📢 公告栏",
        description=content,
        color=0xf1c40f
    )
    embed.set_footer(text=f"频道ID: {channel.id} | 自动置底更新时间: {_now_text()}")
    return embed


async def _repost_attachment_bottom_notice(thread: discord.Thread, config: dict):
    attachment_data = ProtectedAttachmentManager.get_attachments(thread.id)
    if not attachment_data:
        await _delete_thread_message_if_exists(thread, config.get("message_id"))
        ThreadBottomManager.delete_notice(thread.id, "attachment")
        return

    await _delete_thread_message_if_exists(thread, config.get("message_id"))

    embed = _build_attachment_bottom_embed(thread)
    if not embed:
        ThreadBottomManager.delete_notice(thread.id, "attachment")
        return

    sent = await thread.send(embed=embed)
    config["message_id"] = str(sent.id)
    config["updated_at"] = _now_text()
    ThreadBottomManager.set_notice(thread.id, "attachment", config)


async def _repost_announcement_bottom_notice(channel, config: dict):
    content = str(config.get("content", "")).strip()
    if not content:
        await _delete_thread_message_if_exists(channel, config.get("message_id"))
        ThreadBottomManager.delete_notice(channel.id, "announcement")
        return

    await _delete_thread_message_if_exists(channel, config.get("message_id"))

    embed = _build_announcement_bottom_embed(channel, content)
    sent = await channel.send(embed=embed)
    config["message_id"] = str(sent.id)
    config["updated_at"] = _now_text()
    ThreadBottomManager.set_notice(channel.id, "announcement", config)


async def refresh_thread_bottom_notices(channel):
    """重发置底消息，使其始终位于频道底部。"""
    if not _is_announcement_bottom_channel(channel):
        return

    lock_key = f"thread:bottom_notice:lock:{channel.id}"
    try:
        locked = redis.set(lock_key, "1", nx=True, ex=5)
    except Exception:
        locked = True

    if not locked:
        return

    try:
        if isinstance(channel, discord.Thread):
            attachment_cfg = ThreadBottomManager.get_notice(channel.id, "attachment")
            if attachment_cfg and attachment_cfg.get("enabled"):
                await _repost_attachment_bottom_notice(channel, attachment_cfg)

        announcement_cfg = ThreadBottomManager.get_notice(channel.id, "announcement")
        if announcement_cfg and announcement_cfg.get("enabled"):
            await _repost_announcement_bottom_notice(channel, announcement_cfg)
    except Exception as e:
        print(f"⚠️ 刷新帖子置底消息失败: {e}")
    finally:
        try:
            redis.delete(lock_key)
        except Exception:
            pass

# ----------------------
# 工具函数
# ----------------------
def acquire_cmd_lock(interaction_id):
    try:
        return redis.set(f"cmd:lock:{interaction_id}", "1", nx=True, ex=10)
    except:
        return True

def clean_key(val):
    if val is None:
        return None
    if isinstance(val, bytes):
        val = val.decode("utf-8")
    return str(val).strip()

def _normalize_quiz_answer(text: str) -> str:
    return "".join(str(text or "").split())

def _is_correct_quiz_answer(text: str) -> bool:
    return _normalize_quiz_answer(text) == _normalize_quiz_answer(FISH_QUIZ_EXPECTED_ANSWER)

def _build_fish_quiz_embed() -> discord.Embed:
    embed = discord.Embed(
        title="ฅ^•ﻌ•^ฅ 小鱼干身份组答题",
        description=FISH_QUIZ_QUESTION,
        color=0x3498db
    )
    embed.add_field(
        name="操作流程",
        value=(
            "1. 点击下方“开始答题”按钮\n"
            "2. 复制并粘贴完整回答\n"
            "3. 提交后自动发放身份组"
        ),
        inline=False
    )
    embed.add_field(
        name="正确回答",
        value=FISH_QUIZ_EXPECTED_ANSWER,
        inline=False
    )
    embed.set_footer(text="请复制完整回答并作为答案提交")
    return embed

def _fish_quiz_panel_key(channel_id: int) -> str:
    return f"fish:quiz_panel:{channel_id}"

async def ensure_fish_quiz_panel():
    if not FISH_QUIZ_PANEL_CHANNEL_ID:
        return
    try:
        channel_id = int(FISH_QUIZ_PANEL_CHANNEL_ID)
    except Exception:
        print("⚠️ FISH_QUIZ_PANEL_CHANNEL_ID 无效，必须是频道ID数字")
        return

    try:
        channel = bot.get_channel(channel_id) or await bot.fetch_channel(channel_id)
    except Exception as e:
        print(f"⚠️ 获取答题面板频道失败: {e}")
        return

    if not isinstance(channel, discord.TextChannel):
        print("⚠️ 答题面板频道类型不正确，仅支持文字频道")
        return

    key = _fish_quiz_panel_key(channel.id)
    raw_msg_id = clean_key(redis.get(key))
    panel_message = None

    if raw_msg_id:
        try:
            panel_message = await channel.fetch_message(int(raw_msg_id))
        except Exception:
            panel_message = None

    view = FishQuizEntryView()
    embed = _build_fish_quiz_embed()

    if panel_message:
        try:
            await panel_message.edit(embed=embed, view=view)
        except Exception as e:
            print(f"⚠️ 更新答题面板失败: {e}")
        return

    try:
        sent = await channel.send(embed=embed, view=view)
        redis.set(key, str(sent.id))
    except Exception as e:
        print(f"⚠️ 发送答题面板失败: {e}")

def parse_user_agent(ua):
    """从User-Agent提取详细的设备信息（包括具体型号）"""
    import re

    if not ua:
        return {"device": "未知设备", "os": "未知系统", "browser": "未知浏览器", "detail": ""}

    device = "未知设备"
    os_name = "未知系统"
    browser = "未知浏览器"
    detail = ""  # 详细信息（型号等）

    # =====================
    # 识别设备（包含具体型号）
    # =====================
    if "iPhone" in ua:
        # 识别iPhone具体型号
        if "12" in ua or "iPhone12" in ua:
            device = "iPhone 12"
        elif "13" in ua or "iPhone13" in ua:
            device = "iPhone 13"
        elif "14" in ua or "iPhone14" in ua:
            device = "iPhone 14"
            if "Pro" in ua and "Pro Max" not in ua:
                device = "iPhone 14 Pro"
            elif "Pro Max" in ua:
                device = "iPhone 14 Pro Max"
        elif "15" in ua or "iPhone15" in ua:
            device = "iPhone 15"
            if "Pro" in ua and "Pro Max" not in ua:
                device = "iPhone 15 Pro"
            elif "Pro Max" in ua:
                device = "iPhone 15 Pro Max"
            elif "Plus" in ua:
                device = "iPhone 15 Plus"
        else:
            device = "iPhone"
    elif "iPad" in ua:
        # 识别iPad具体型号
        if "iPad Pro" in ua:
            if "12.9" in ua:
                device = "iPad Pro 12.9\""
            elif "11" in ua:
                device = "iPad Pro 11\""
            else:
                device = "iPad Pro"
        elif "iPad Air" in ua:
            device = "iPad Air"
        elif "iPad mini" in ua:
            device = "iPad mini"
        else:
            device = "iPad"
    elif "Android" in ua:
        # 识别Android手机品牌和型号
        if "SM-" in ua:  # Samsung
            match = re.search(r"SM-([A-Z0-9]+)", ua)
            device = f"三星 Galaxy ({match.group(1)})" if match else "三星手机"
        elif "Pixel" in ua:
            match = re.search(r"Pixel ([0-9]+)", ua)
            device = f"Google Pixel {match.group(1)}" if match else "Google Pixel"
        elif "HONOR" in ua:  # 荣耀
            match = re.search(r"HONOR ([A-Za-z0-9]+)", ua)
            device = f"荣耀 {match.group(1)}" if match else "荣耀手机"
        elif "HUAWEI" in ua or "Huawei" in ua:  # 华为
            match = re.search(r"[Hh]uawei ([A-Za-z0-9\-]+)", ua)
            device = f"华为 {match.group(1)}" if match else "华为手机"
        elif "Xiaomi" in ua or "MI " in ua:  # 小米
            match = re.search(r"(?:Xiaomi|MI ([0-9A-Za-z]+))", ua)
            device = f"小米 {match.group(1)}" if match else "小米手机"
        elif "OPPO" in ua:
            match = re.search(r"OPPO ([A-Z0-9\-]+)", ua)
            device = f"OPPO {match.group(1)}" if match else "OPPO手机"
        elif "vivo" in ua:
            match = re.search(r"vivo ([A-Z0-9\-]+)", ua)
            device = f"vivo {match.group(1)}" if match else "vivo手机"
        elif "OnePlus" in ua or "ONEPLUS" in ua:
            match = re.search(r"[Oo]ne[Pp]lus ([A-Z0-9]+)", ua)
            device = f"一加 {match.group(1)}" if match else "一加手机"
        else:
            device = "Android手机"
    elif "Windows NT" in ua:
        device = "Windows电脑"
    elif "Mac" in ua:
        device = "Mac电脑"
    elif "Linux" in ua and "Android" not in ua:
        device = "Linux电脑"

    # =====================
    # 识别操作系统（包含版本号）
    # =====================
    if "Windows NT 10.0" in ua:
        if "Windows NT 10.0; Win64; x64" in ua:
            os_name = "Windows 10 (64位)"
        else:
            os_name = "Windows 10"
    elif "Windows NT 11.0" in ua:
        os_name = "Windows 11"
    elif "Windows NT 6.3" in ua:
        os_name = "Windows 8.1"
    elif "Windows" in ua:
        os_name = "Windows"
    elif "Mac OS X" in ua:
        match = re.search(r"Mac OS X ([0-9_]+)", ua)
        if match:
            version = match.group(1).replace("_", ".")
            os_name = f"macOS {version}"
        else:
            os_name = "macOS"
    elif "Android" in ua:
        match = re.search(r"Android ([0-9.]+)", ua)
        if match:
            version = match.group(1)
            version_map = {
                "14": "Android 14",
                "13": "Android 13",
                "12": "Android 12",
                "11": "Android 11",
                "10": "Android 10"
            }
            os_name = version_map.get(version.split(".")[0], f"Android {version}")
        else:
            os_name = "Android"
    elif "iPhone" in ua or "iPad" in ua:
        match = re.search(r"CPU (?:iPhone )?OS ([0-9_]+)", ua)
        if match:
            version = match.group(1).replace("_", ".")
            os_name = f"iOS {version}"
        else:
            os_name = "iOS"
    elif "Linux" in ua and "Android" not in ua:
        os_name = "Linux"

    # =====================
    # 识别浏览器（包含版本号）
    # =====================
    if "Chrome" in ua and "Chromium" not in ua and "Chrome" not in browser:
        match = re.search(r"Chrome/([0-9.]+)", ua)
        browser = f"Chrome {match.group(1)}" if match else "Chrome"
    elif "Safari" in ua and "Chrome" not in ua:
        match = re.search(r"Version/([0-9.]+)", ua)
        browser = f"Safari {match.group(1)}" if match else "Safari"
    elif "Firefox" in ua:
        match = re.search(r"Firefox/([0-9.]+)", ua)
        browser = f"Firefox {match.group(1)}" if match else "Firefox"
    elif "Edge" in ua or "Edg/" in ua:
        match = re.search(r"Edg[e]?/([0-9.]+)", ua)
        browser = f"Edge {match.group(1)}" if match else "Edge"
    elif "OPR/" in ua:  # Opera
        match = re.search(r"OPR/([0-9.]+)", ua)
        browser = f"Opera {match.group(1)}" if match else "Opera"
    elif "WeChat" in ua:
        browser = "微信浏览器"
    elif "QQ" in ua:
        browser = "QQ浏览器"
    elif "Alipay" in ua:
        browser = "支付宝浏览器"
    elif "Mobile" in ua:
        match = re.search(r"Safari", ua)
        browser = "Safari (Mobile)" if match else "移动浏览器"
    else:
        browser = "其他浏览器"

    return {
        "device": device,
        "os": os_name,
        "browser": browser,
        "detail": detail
    }

def generate_csv_report(keys_data):
    """生成CSV格式的报表"""
    output = StringIO()
    writer = csv.writer(output)

    # 表头
    writer.writerow([
        "密钥",
        "领取者",
        "用户ID",
        "发放时间",
        "发放方式",
        "使用状态",
        "使用时间",
        "IP地址",
        "设备类型",
        "操作系统",
        "浏览器",
        "完整User-Agent"
    ])

    # 数据行
    for key_info in keys_data:
        writer.writerow([
            key_info.get("key", ""),
            key_info.get("owner_name", ""),
            key_info.get("uid", ""),
            key_info.get("issued_at", ""),
            key_info.get("method", ""),
            key_info.get("status", ""),
            key_info.get("used_at", ""),
            key_info.get("ip", ""),
            key_info.get("device", ""),
            key_info.get("os", ""),
            key_info.get("browser", ""),
            key_info.get("user_agent", "")
        ])

    return output.getvalue()

# ----------------------
# AI 答疑与聊天
# ----------------------
FAQ_ITEMS = [
    {
        "q": "怎么领取密钥？",
        "a": "先在可领取频道发包含“喵机1号”的消息，然后用 /领取密钥。每人10分钟只能领取一次，密钥会私信发送。"
    },
    {
        "q": "密钥收不到/无法私信？",
        "a": "在服务器隐私设置里开启“允许来自服务器成员的私信”，再重新使用 /领取密钥。"
    },
    {
        "q": "如何查看自己的密钥记录？",
        "a": "使用 /我的密钥 查看全部记录与使用信息。"
    },
    {
        "q": "管理员如何查询用户密钥？",
        "a": "管理员使用 /用户日志 @成员 查看详细记录。"
    },
    {
        "q": "工单怎么开/怎么关？",
        "a": "管理员用 /工单面板 发面板，成员点“创建工单”。管理员在工单频道用 /关闭工单 关闭。"
    },
    {
        "q": "保护附件怎么下？",
        "a": "在帖子里点赞首条消息 + 评论，然后用 /领取保护附件 获取下载链接。"
    },
    {
        "q": "公告置底怎么用？",
        "a": "管理员或帖主用 /公告置底 内容 设置；用 /删除公告置底 取消。"
    },
    {
        "q": "怎么快速回到首楼？",
        "a": "使用 /回顶 获取首楼跳转链接。"
    }
]

_AI_LAST_REPLY_AT = {}
_AI_LAST_NOTICE_AT = {}
_AI_SEMAPHORE = asyncio.Semaphore(AI_MAX_CONCURRENCY)
_AI_MISSING_KEY_LOGGED = False
_COMMAND_CATALOG_CACHE = {"text": "", "ts": 0.0}
_REPO_TREE_CACHE = {"ts": 0.0, "files": []}
_REPO_FILE_CONTENT_CACHE = {}
_REPO_DOC_EXTS = (".md", ".mdx", ".markdown")
_REPO_CODE_EXTS = (".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".html", ".css")
_REPO_ALLOWED_EXTS = _REPO_CODE_EXTS + _REPO_DOC_EXTS
_REPO_KEYWORD_MAP = {
    "登录": ["login", "auth", "oauth", "signin", "sign-in"],
    "登陆": ["login", "auth", "signin", "sign-in"],
    "注册": ["register", "signup", "sign-up"],
    "账号": ["account", "user", "profile", "member"],
    "用户": ["user", "account", "member", "profile"],
    "验证": ["verify", "validate", "auth", "check"],
    "认证": ["auth", "oauth", "verify"],
    "绑定": ["bind", "link", "connect"],
    "密钥": ["key", "token", "apikey", "license", "secret"],
    "领取": ["claim", "redeem", "issue", "get"],
    "私信": ["dm", "direct", "message", "pm"],
    "工单": ["ticket", "support", "helpdesk"],
    "公告": ["announcement", "notice", "broadcast"],
    "置底": ["pin", "sticky", "bottom", "bump"],
    "保护附件": ["attachment", "protected", "gated"],
    "附件": ["attachment", "file", "asset"],
    "上传": ["upload", "attachment", "file"],
    "下载": ["download", "attachment", "file"],
    "帖子": ["thread", "post", "forum"],
    "论坛": ["forum", "thread", "post"],
    "评论": ["comment", "reply", "message", "post"],
    "点赞": ["like", "reaction", "emoji"],
    "反应": ["reaction", "emoji"],
    "消息": ["message", "chat"],
    "聊天": ["chat", "message", "conversation"],
    "群聊": ["group", "group-chat", "chat"],
    "角色": ["character", "persona", "role"],
    "角色卡": ["character", "card", "persona", "role"],
    "图片": ["image", "img", "picture", "photo"],
    "图片生成": ["image", "draw", "generate", "ai-image-generator", "gen"],
    "绘图": ["image", "draw", "generate", "gen"],
    "语音": ["voice", "audio", "tts", "speech"],
    "音乐": ["music", "audio", "sound"],
    "设置": ["settings", "config", "configuration"],
    "选项": ["settings", "options", "config"],
    "权限": ["permission", "perm", "role", "auth"],
    "后台": ["admin", "dashboard", "manage", "panel"],
    "管理": ["admin", "manage", "moderation", "panel"],
    "面板": ["panel", "dashboard", "board"],
    "页面": ["page", "html", "ui", "view", "screen"],
    "界面": ["ui", "view", "screen", "page"],
    "按钮": ["button", "btn", "action"],
    "样式": ["style", "css", "theme"],
    "主题": ["theme", "style", "css"],
    "背景": ["background", "bg"],
    "字体": ["font", "typography"],
    "缓存": ["cache", "storage", "localstorage", "indexeddb"],
    "存储": ["storage", "cache", "localstorage", "indexeddb"],
    "回顶": ["bump", "top", "pin", "jump", "starter"],
    "代理": ["proxy", "cors", "cloudflare"],
    "跨域": ["cors", "proxy", "cross-origin"],
    "命令": ["command", "slash", "bot", "interaction"],
    "指令": ["command", "slash", "bot", "interaction"],
    "机器人": ["bot", "discord", "command"],
    "频道": ["channel", "thread"],
    "网页": ["web", "site", "page"],
    "网站": ["web", "site", "page"],
    "手机": ["mobile", "phone", "ios", "android"],
    "小手机": ["mobile", "phone", "ios", "android", "iphone"],
    "安卓": ["android"],
    "苹果": ["ios", "iphone", "ipad", "apple"],
    "浏览器": ["browser", "chrome", "safari", "edge", "firefox"],
    "入口": ["entry", "start", "open", "launch"],
    "帮助": ["help", "support", "faq", "guide"],
    "教程": ["guide", "tutorial", "howto"],
    "指南": ["guide", "manual"],
    "步骤": ["steps", "guide"],
    "报错": ["error", "exception", "traceback", "fail"],
    "错误": ["error", "exception", "issue", "bug"],
    "异常": ["error", "exception", "issue"],
    "失败": ["fail", "failed", "error"],
    "无法": ["fail", "cannot", "unable", "error"],
    "打不开": ["error", "failed", "load", "open", "404", "403"],
    "不显示": ["render", "display", "show", "hidden"],
    "加载": ["load", "loading", "fetch", "request"],
    "卡住": ["freeze", "hang", "stuck", "timeout", "slow"]
}


def _parse_github_repo(url: str) -> tuple:
    if not url:
        return None, None
    match = re.search(r"github\.com/([^/]+)/([^/]+)", url)
    if not match:
        return None, None
    owner = match.group(1)
    repo = match.group(2)
    if repo.endswith(".git"):
        repo = repo[:-4]
    return owner, repo


def _get_cached_repo_content(path: str) -> Optional[str]:
    if not AI_REPO_CONTENT_CACHE_TTL_SEC:
        return None
    entry = _REPO_FILE_CONTENT_CACHE.get(path)
    if not entry:
        return None
    ts = entry.get("ts", 0)
    if time.time() - ts > AI_REPO_CONTENT_CACHE_TTL_SEC:
        _REPO_FILE_CONTENT_CACHE.pop(path, None)
        return None
    return entry.get("content")


def _set_cached_repo_content(path: str, content: str):
    if not AI_REPO_CONTENT_CACHE_TTL_SEC:
        return
    if not path or content is None:
        return
    _REPO_FILE_CONTENT_CACHE[path] = {"ts": time.time(), "content": content}


def _extract_cn_phrases(text: str) -> list:
    if not text:
        return []
    phrases = re.findall(r"[\u4e00-\u9fff]{2,}", text)
    return list(dict.fromkeys(phrases))


def _tokenize_repo_path(path: str) -> list:
    if not path:
        return []
    tokens = re.split(r"[^a-z0-9]+", path.lower())
    return [t for t in tokens if t]


def _is_doc_path(path_lower: str) -> bool:
    return path_lower.endswith(_REPO_DOC_EXTS)


def _prioritize_code_paths(paths: list) -> list:
    if not paths:
        return []
    code_paths = [p for p in paths if not _is_doc_path(p.lower())]
    doc_paths = [p for p in paths if _is_doc_path(p.lower())]
    return code_paths + doc_paths


def _prefer_code_paths(paths: list) -> list:
    if not paths:
        return []
    ordered = _prioritize_code_paths(paths)
    if any(not _is_doc_path(p.lower()) for p in ordered):
        ordered = [p for p in ordered if not _is_doc_path(p.lower())]
    return ordered


def _score_repo_path(path_lower: str, keywords: list) -> int:
    if not path_lower or not keywords:
        return 0
    tokens = _tokenize_repo_path(path_lower)
    filename = path_lower.rsplit("/", 1)[-1]
    score = 0
    for raw in keywords:
        if not raw:
            continue
        key = str(raw).lower()
        if len(key) < 2:
            continue
        if key in path_lower:
            score += 2
        if key in tokens:
            score += 3
        if key in filename:
            score += 2
    score -= min(len(path_lower) // 80, 3)
    if _is_doc_path(path_lower):
        score -= 2
    else:
        score += 1
    return score


def _should_read_repo_code(text: str) -> bool:
    if not text:
        return False
    if re.search(r"(?i)[\w./-]+\.(js|jsx|ts|tsx|py|md|mdx|json|html|css)", text):
        return True
    triggers = (
        "源码", "代码", "实现", "函数", "在哪", "文件", "配置", "报错", "错误", "bug", "接口", "api",
        "命令", "指令", "功能", "入口", "设置", "权限", "登录", "注册", "密钥", "私信", "工单", "公告",
        "附件", "下载", "上传", "代理", "跨域", "角色", "聊天", "图片", "绘图", "页面", "样式",
        "哪里", "找不到", "没找到", "找不着"
    )
    if any(t in text for t in triggers):
        return True
    if _looks_like_question(text):
        return True
    return any(zh in text for zh in _REPO_KEYWORD_MAP.keys())


def _extract_repo_path_candidates(text: str) -> list:
    if not text:
        return []
    paths = []
    for match in re.finditer(r"(?i)[\w./-]+\.(js|jsx|ts|tsx|py|md|mdx|json|html|css)", text):
        path = match.group(0).replace("\\", "/").lstrip("/")
        paths.append(path)
    if "README" in text or "readme" in text:
        paths.append("README.md")
    return list(dict.fromkeys(paths))


def _extract_repo_keywords(text: str) -> list:
    if not text:
        return []
    keywords = []
    for token in re.findall(r"[A-Za-z0-9_\-]{3,}", text):
        keywords.append(token.lower())
    keywords.extend(_extract_cn_phrases(text))
    for zh, mapped in _REPO_KEYWORD_MAP.items():
        if zh in text:
            keywords.extend(mapped)
    return list(dict.fromkeys(keywords))


def _select_repo_files(file_list: list, path_candidates: list, keywords: list) -> list:
    if not file_list:
        return []
    path_to_size = {f["path"].lower(): f.get("size", 0) for f in file_list}
    normalized_paths = [f["path"] for f in file_list]

    if path_candidates:
        matched = []
        for candidate in path_candidates:
            cand_lower = candidate.lower()
            for path in normalized_paths:
                path_lower = path.lower()
                if path_lower == cand_lower or path_lower.endswith("/" + cand_lower):
                    if path_to_size.get(path_lower, 0) <= AI_REPO_MAX_FILE_BYTES:
                        matched.append(path)
        if matched:
            matched = _prefer_code_paths(matched)
            return matched[:AI_REPO_MAX_FILES]

    if not keywords:
        return []

    scored = []
    for path in normalized_paths:
        path_lower = path.lower()
        if not path_lower.endswith(_REPO_ALLOWED_EXTS):
            continue
        if path_to_size.get(path_lower, 0) > AI_REPO_MAX_FILE_BYTES:
            continue
        score = _score_repo_path(path_lower, keywords)
        if score > 0:
            scored.append((score, path))

    scored.sort(key=lambda x: (-x[0], len(x[1])))
    paths = [p for _, p in scored]
    paths = _prefer_code_paths(paths)
    return paths[:AI_REPO_MAX_FILES]


def _select_repo_fallback_files(file_list: list) -> list:
    if not file_list:
        return []

    path_to_size = {f["path"].lower(): f.get("size", 0) for f in file_list}
    lower_to_path = {f["path"].lower(): f["path"] for f in file_list}

    code_candidates = [
        f for f in file_list
        if f.get("path", "").lower().endswith(_REPO_CODE_EXTS)
        and f.get("size", 0) <= AI_REPO_MAX_FILE_BYTES
    ]
    code_candidates.sort(key=lambda x: (x.get("size", 0), len(x.get("path", ""))))
    if code_candidates:
        return [f["path"] for f in code_candidates[:AI_REPO_MAX_FILES]]

    preferred = [
        "README.md",
        "README.MD",
        "readme.md",
        "README_CN.md",
        "README_ZH.md",
        "docs/README.md",
        "docs/readme.md",
        "docs/README_CN.md",
        "docs/README_ZH.md"
    ]

    selected = []
    for pref in preferred:
        pref_lower = pref.lower()
        real_path = lower_to_path.get(pref_lower)
        if not real_path:
            continue
        if path_to_size.get(pref_lower, 0) > AI_REPO_MAX_FILE_BYTES:
            continue
        selected.append(real_path)
        if len(selected) >= AI_REPO_MAX_FILES:
            return selected

    md_candidates = [
        f for f in file_list
        if f.get("path", "").lower().endswith(".md")
        and f.get("size", 0) <= AI_REPO_MAX_FILE_BYTES
    ]
    md_candidates.sort(key=lambda x: (x.get("size", 0), len(x.get("path", ""))))
    if md_candidates:
        return [f["path"] for f in md_candidates[:AI_REPO_MAX_FILES]]

    ext_candidates = [
        f for f in file_list
        if f.get("path", "").lower().endswith(_REPO_ALLOWED_EXTS)
        and f.get("size", 0) <= AI_REPO_MAX_FILE_BYTES
    ]
    ext_candidates.sort(key=lambda x: (x.get("size", 0), len(x.get("path", ""))))
    return [f["path"] for f in ext_candidates[:AI_REPO_MAX_FILES]]


def _extract_repo_snippet(content: str, keywords: list) -> str:
    if not content:
        return ""
    lines = content.splitlines()
    max_lines = min(AI_REPO_MAX_SNIPPET_LINES, len(lines))
    if not keywords:
        snippet = "\n".join(f"{i + 1}: {lines[i]}" for i in range(max_lines))
        if AI_REPO_MAX_SNIPPET_CHARS > 0 and len(snippet) > AI_REPO_MAX_SNIPPET_CHARS:
            trimmed = snippet[:AI_REPO_MAX_SNIPPET_CHARS]
            if "\n" in trimmed:
                trimmed = trimmed.rsplit("\n", 1)[0]
            snippet = trimmed.rstrip() + "\n..."
        return snippet

    lowered = [k.lower() for k in keywords]
    indexes = []
    for i, line in enumerate(lines):
        lline = line.lower()
        if any(k in lline for k in lowered):
            start = max(0, i - 2)
            end = min(len(lines), i + 3)
            indexes.extend(range(start, end))
        if len(indexes) >= max_lines:
            break

    if not indexes:
        snippet = "\n".join(f"{i + 1}: {lines[i]}" for i in range(max_lines))
        if AI_REPO_MAX_SNIPPET_CHARS > 0 and len(snippet) > AI_REPO_MAX_SNIPPET_CHARS:
            trimmed = snippet[:AI_REPO_MAX_SNIPPET_CHARS]
            if "\n" in trimmed:
                trimmed = trimmed.rsplit("\n", 1)[0]
            snippet = trimmed.rstrip() + "\n..."
        return snippet

    unique_indexes = sorted(set(indexes))[:max_lines]
    snippet = "\n".join(f"{i + 1}: {lines[i]}" for i in unique_indexes)
    if AI_REPO_MAX_SNIPPET_CHARS > 0 and len(snippet) > AI_REPO_MAX_SNIPPET_CHARS:
        trimmed = snippet[:AI_REPO_MAX_SNIPPET_CHARS]
        if "\n" in trimmed:
            trimmed = trimmed.rsplit("\n", 1)[0]
        snippet = trimmed.rstrip() + "\n..."
    return snippet


async def _fetch_repo_tree() -> list:
    if not AI_REPO_READ_ENABLED:
        return []
    now = time.time()
    if AI_REPO_CACHE_TTL_SEC > 0 and _REPO_TREE_CACHE["files"] and now - _REPO_TREE_CACHE["ts"] < AI_REPO_CACHE_TTL_SEC:
        return _REPO_TREE_CACHE["files"]

    owner, repo = _parse_github_repo(AI_REPO_URL)
    if not owner or not repo:
        return []

    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{AI_REPO_BRANCH}?recursive=1"
    headers = {
        "User-Agent": "ai-qa-bot",
        "Accept": "application/vnd.github+json"
    }
    if AI_GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {AI_GITHUB_TOKEN}"
    timeout = aiohttp.ClientTimeout(total=AI_REPO_TIMEOUT_SEC)

    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url, headers=headers) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()
    except Exception:
        return []

    tree = data.get("tree", [])
    files = []
    for item in tree:
        if item.get("type") != "blob":
            continue
        path = item.get("path")
        if not path:
            continue
        files.append({"path": path, "size": item.get("size", 0)})

    if AI_REPO_CACHE_TTL_SEC > 0:
        _REPO_TREE_CACHE["files"] = files
        _REPO_TREE_CACHE["ts"] = now
    else:
        _REPO_TREE_CACHE["files"] = []
        _REPO_TREE_CACHE["ts"] = 0.0
    return files


def _rank_repo_search_terms(keywords: list) -> list:
    if not keywords:
        return []
    normalized = [str(k).lower() for k in keywords if k]
    ascii_terms = [k for k in normalized if re.fullmatch(r"[a-z0-9_\-]+", k)]
    other_terms = [k for k in normalized if k not in ascii_terms]

    ascii_terms = sorted(dict.fromkeys(ascii_terms), key=lambda x: (-len(x), x))
    other_terms = sorted(dict.fromkeys(other_terms), key=lambda x: (-len(x), x))

    ranked = []
    max_len = max(len(ascii_terms), len(other_terms))
    for i in range(max_len):
        if i < len(ascii_terms):
            ranked.append(ascii_terms[i])
        if i < len(other_terms):
            ranked.append(other_terms[i])

    return ranked


async def _search_repo_files(keywords: list) -> list:
    if not keywords:
        return []
    if not AI_GITHUB_TOKEN and not AI_GITHUB_SEARCH_ALLOW_NO_TOKEN:
        return []
    owner, repo = _parse_github_repo(AI_REPO_URL)
    if not owner or not repo:
        return []

    ranked_terms = _rank_repo_search_terms(keywords)
    if not ranked_terms:
        return []

    queries = [ranked_terms[0]]
    if len(ranked_terms) > 1:
        queries.append(f"{ranked_terms[0]} {ranked_terms[1]}")
    if len(ranked_terms) > 2:
        queries.append(ranked_terms[2])

    unique_queries = []
    for q in queries:
        q = q.strip()
        if q and q not in unique_queries:
            unique_queries.append(q)
    queries = unique_queries[:max(1, AI_REPO_SEARCH_MAX_QUERIES)]

    per_page = min(20, max(AI_REPO_MAX_FILES * 2, 10))
    headers = {
        "User-Agent": "ai-qa-bot",
        "Accept": "application/vnd.github+json"
    }
    if AI_GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {AI_GITHUB_TOKEN}"
    timeout = aiohttp.ClientTimeout(total=AI_REPO_TIMEOUT_SEC)

    paths = []
    for query_terms in queries:
        query = f"{quote_plus(query_terms)}+repo:{owner}/{repo}"
        url = f"https://api.github.com/search/code?q={query}&per_page={per_page}"
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url, headers=headers) as resp:
                    if resp.status != 200:
                        continue
                    data = await resp.json()
        except Exception:
            continue

        items = data.get("items", [])
        for item in items:
            path = item.get("path")
            if path:
                paths.append(path)
        if len(paths) >= AI_REPO_MAX_FILES:
            break

    paths = list(dict.fromkeys(paths))
    paths = _prefer_code_paths(paths)
    return paths[:AI_REPO_MAX_FILES]


async def _scan_repo_files_by_content(
    file_list: list,
    keywords: list,
    max_files: Optional[int] = None,
    time_budget: Optional[float] = None
) -> list:
    if not keywords or not file_list:
        return []

    max_files = max_files or AI_REPO_SCAN_MAX_FILES
    time_budget = AI_REPO_SCAN_MAX_SECONDS if time_budget is None else time_budget

    candidates = []
    for item in file_list:
        path = item.get("path", "")
        path_lower = path.lower()
        if not path_lower.endswith(_REPO_ALLOWED_EXTS):
            continue
        if item.get("size", 0) > AI_REPO_MAX_FILE_BYTES:
            continue
        score = _score_repo_path(path_lower, keywords)
        candidates.append((score, item.get("size", 0), path))

    if not candidates:
        return []

    candidates.sort(key=lambda x: (-x[0], x[1], len(x[2])))
    if candidates and candidates[0][0] <= 0:
        candidates.sort(key=lambda x: (x[1], len(x[2])))

    scan_paths = [p for _, _, p in candidates[:max_files]]
    results = []
    start_ts = time.time()
    batch_size = max(1, AI_REPO_SCAN_CONCURRENCY)

    async def _score_path(path: str):
        content = await _fetch_repo_file_content(path)
        if not content:
            return None
        lower = content.lower()
        hit = 0
        for key in keywords:
            if not key:
                continue
            key_text = str(key).lower()
            if len(key_text) < 2:
                continue
            if key_text in lower:
                hit += 1
        if hit > 0:
            return (hit, path)
        return None

    for i in range(0, len(scan_paths), batch_size):
        if time_budget > 0 and time.time() - start_ts > time_budget:
            break
        batch = scan_paths[i:i + batch_size]
        batch_results = await asyncio.gather(
            *[_score_path(path) for path in batch],
            return_exceptions=True
        )
        for item in batch_results:
            if isinstance(item, tuple):
                results.append(item)
        if len(results) >= AI_REPO_MAX_FILES:
            break

    results.sort(key=lambda x: (-x[0], len(x[1])))
    return [p for _, p in results[:AI_REPO_MAX_FILES]]


async def _fetch_repo_file_content(path: str) -> str:
    owner, repo = _parse_github_repo(AI_REPO_URL)
    if not owner or not repo or not path:
        return ""
    cached = _get_cached_repo_content(path)
    if cached is not None:
        return cached

    timeout = aiohttp.ClientTimeout(total=AI_REPO_TIMEOUT_SEC)
    if AI_REPO_RAW_URL_ENABLED and not AI_GITHUB_TOKEN:
        raw_path = quote(path, safe="/")
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{AI_REPO_BRANCH}/{raw_path}"
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(raw_url) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        if AI_REPO_MAX_FILE_BYTES > 0 and len(text.encode("utf-8")) > AI_REPO_MAX_FILE_BYTES:
                            return ""
                        _set_cached_repo_content(path, text)
                        return text
        except Exception:
            pass

    headers = {
        "User-Agent": "ai-qa-bot",
        "Accept": "application/vnd.github+json"
    }
    if AI_GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {AI_GITHUB_TOKEN}"

    api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={AI_REPO_BRANCH}"
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(api_url, headers=headers) as resp:
                if resp.status != 200:
                    return ""
                data = await resp.json()
    except Exception:
        return ""

    if not isinstance(data, dict):
        return ""
    if data.get("type") != "file":
        return ""
    size = int(data.get("size", 0) or 0)
    if AI_REPO_MAX_FILE_BYTES > 0 and size > AI_REPO_MAX_FILE_BYTES:
        return ""

    encoding = data.get("encoding")
    content = data.get("content")
    if not content:
        return ""
    if encoding == "base64":
        try:
            decoded = base64.b64decode(content).decode("utf-8", errors="ignore")
            _set_cached_repo_content(path, decoded)
            return decoded
        except Exception:
            return ""

    text = str(content)
    _set_cached_repo_content(path, text)
    return text


async def _build_repo_context(user_text: str, force_read: bool = False) -> str:
    if not force_read and not _should_read_repo_code(user_text):
        return ""

    file_list = await _fetch_repo_tree()
    if not file_list:
        return ""

    path_candidates = _extract_repo_path_candidates(user_text)
    keywords = _extract_repo_keywords(user_text)
    selected = _select_repo_files(file_list, path_candidates, keywords)
    used_fallback = False
    if not selected and keywords:
        selected = await _search_repo_files(keywords)
    should_deep_scan = AI_REPO_FORCE_DEEP_SCAN or force_read or _looks_like_question(user_text) or any(
        zh in user_text for zh in _REPO_KEYWORD_MAP.keys()
    )
    if keywords:
        scan_limit = AI_REPO_DEEP_SCAN_MAX_FILES if should_deep_scan else AI_REPO_SCAN_MAX_FILES
        scan_time = AI_REPO_DEEP_SCAN_MAX_SECONDS if should_deep_scan else AI_REPO_SCAN_MAX_SECONDS
        scan_selected = await _scan_repo_files_by_content(
            file_list,
            keywords,
            max_files=scan_limit,
            time_budget=scan_time
        )
        if scan_selected:
            selected = scan_selected + [p for p in selected if p not in scan_selected]
    should_fallback = force_read or should_deep_scan
    if not selected and should_fallback:
        selected = _select_repo_fallback_files(file_list)
        used_fallback = bool(selected)
    if selected:
        selected = _prefer_code_paths(selected)
    if not selected:
        return ""
    async def _build_parts(paths: list) -> list:
        parts = []
        for path in paths:
            content = await _fetch_repo_file_content(path)
            if not content:
                continue
            snippet = _extract_repo_snippet(content, keywords)
            if snippet:
                parts.append(f"[{path}]\n{snippet}")
        return parts

    parts = await _build_parts(selected)
    if not parts and should_fallback and not used_fallback:
        selected = _select_repo_fallback_files(file_list)
        used_fallback = bool(selected)
        parts = await _build_parts(selected)

    if not parts:
        return ""

    header = "仓库代码参考（只读摘要，勿大段复述）：\n"
    if used_fallback:
        header = "仓库代码参考（未找到直接匹配文件，已读取 README/文档）：\n"
    return header + "\n\n".join(parts)


def _split_repo_context(context: str) -> tuple:
    if not context:
        return "", []
    lines = context.splitlines()
    if not lines:
        return "", []
    header = lines[0].strip()
    body = "\n".join(lines[1:]).strip()
    parts = [p for p in body.split("\n\n") if p.strip()]
    return header, parts


def _merge_repo_context_header(primary: str, candidate: str) -> str:
    if not primary:
        return candidate
    if not candidate:
        return primary
    if "未找到直接匹配文件" in primary and "未找到直接匹配文件" not in candidate:
        return candidate
    return primary


async def _build_repo_context_iterative(
    user_text: str,
    force_read: bool = False,
    extra_texts: Optional[list] = None,
    max_rounds: int = 1
) -> str:
    if max_rounds <= 1:
        return await _build_repo_context(user_text, force_read=force_read)

    queries = []
    if user_text:
        queries.append(user_text)

    merged_extra = "\n".join([str(t).strip() for t in (extra_texts or []) if str(t).strip()])
    if merged_extra:
        queries.append((user_text + "\n" + merged_extra).strip())

    keywords = _extract_repo_keywords(user_text)
    if keywords:
        queries.append((user_text + "\n" + " ".join(keywords)).strip())

    deduped = []
    seen = set()
    for q in queries:
        if q and q not in seen:
            seen.add(q)
            deduped.append(q)
        if len(deduped) >= max_rounds:
            break

    merged_header = ""
    merged_parts = []
    for query in deduped:
        context = await _build_repo_context(query, force_read=force_read)
        if not context:
            continue
        header, parts = _split_repo_context(context)
        merged_header = _merge_repo_context_header(merged_header, header)
        for part in parts:
            if part not in merged_parts:
                merged_parts.append(part)
        if merged_parts and not force_read:
            break

    if not merged_parts:
        return ""

    merged_parts = merged_parts[:AI_REPO_MAX_FILES]
    header_text = merged_header or "仓库代码参考："
    return header_text + "\n" + "\n\n".join(merged_parts)


def _parse_channel_filter(value: str) -> set:
    if not value:
        return set()
    parts = [p.strip() for p in value.split(",") if p.strip()]
    return set(parts)


_AI_CHANNEL_ALLOW_SET = _parse_channel_filter(AI_CHANNEL_ALLOWLIST)
_AI_CHANNEL_BLOCK_SET = _parse_channel_filter(AI_CHANNEL_BLOCKLIST)


def _channel_matches_filter(channel, filter_set: set) -> bool:
    if not filter_set:
        return False
    channel_id = str(getattr(channel, "id", ""))
    if channel_id and channel_id in filter_set:
        return True
    channel_name = str(getattr(channel, "name", ""))
    if channel_name and channel_name in filter_set:
        return True
    if isinstance(channel, discord.Thread):
        parent_id = str(getattr(channel, "parent_id", ""))
        if parent_id and parent_id in filter_set:
            return True
        parent = getattr(channel, "parent", None)
        parent_name = str(getattr(parent, "name", "")) if parent else ""
        if parent_name and parent_name in filter_set:
            return True
    return False


def _is_channel_allowed(channel) -> bool:
    if _AI_CHANNEL_BLOCK_SET and _channel_matches_filter(channel, _AI_CHANNEL_BLOCK_SET):
        return False
    if _AI_CHANNEL_ALLOW_SET and not _channel_matches_filter(channel, _AI_CHANNEL_ALLOW_SET):
        return False
    return True


def _looks_like_question(text: str) -> bool:
    if not text:
        return False
    if "?" in text or "？" in text:
        return True
    keywords = ("怎么", "如何", "为啥", "为什么", "能不能", "可以吗", "用法", "教程", "帮助", "命令", "指令")
    return any(k in text for k in keywords)


def _should_include_command_catalog(text: str) -> bool:
    if not text:
        return False
    keywords = ("命令", "指令", "用法", "怎么用", "如何用", "功能", "权限", "管理员")
    return any(k in text for k in keywords)


def _build_command_catalog_text() -> str:
    now = time.time()
    if _COMMAND_CATALOG_CACHE["text"] and now - _COMMAND_CATALOG_CACHE["ts"] < 300:
        return _COMMAND_CATALOG_CACHE["text"]

    items = []
    try:
        for cmd in bot.tree.get_commands():
            name = getattr(cmd, "qualified_name", cmd.name)
            desc = (cmd.description or "").strip()
            if desc:
                items.append(f"/{name} - {desc}")
            else:
                items.append(f"/{name}")
    except Exception:
        items = []

    items = sorted(items)
    text = "\n".join(items) if items else "（暂无可用指令）"
    _COMMAND_CATALOG_CACHE["text"] = text
    _COMMAND_CATALOG_CACHE["ts"] = now
    return text


def _build_faq_text() -> str:
    lines = []
    for item in FAQ_ITEMS:
        q = str(item.get("q", "")).strip()
        a = str(item.get("a", "")).strip()
        if q and a:
            lines.append(f"Q: {q}\nA: {a}")
    return "\n\n".join(lines)


def _build_key_help_tips(user_text: str) -> list:
    text = (user_text or "").strip()
    tips = []

    if text:
        if "喵机一号" in text:
            tips.append("数字要用 1，不是“一”。")
        if "喵叽" in text:
            tips.append("是“喵机1号”，不是“喵叽1号”。")
        if "喵机 1号" in text or "喵机1 号" in text or "喵机 1 号" in text:
            tips.append("不要加空格，直接发送“喵机1号”。")
        if "喵机1" in text and "喵机1号" not in text:
            tips.append("要带“号”，完整是“喵机1号”。")
        if "领取密钥" in text and "/领取密钥" not in text:
            tips.append("命令需要加斜杠：/领取密钥。")
    return list(dict.fromkeys(tips))


def _build_key_help_fallback_text(user_text: str) -> str:
    tips = _build_key_help_tips(user_text)
    lines = []
    if tips:
        lines.append("你可能打错了：\n" + "\n".join(f"• {t}" for t in tips))

    lines.append(
        "正确流程是：\n"
        "1️⃣ 在可领取频道单独发送“喵机1号”（数字必须是 1，不能写 一）\n"
        "2️⃣ 发送命令 /领取密钥（只发命令，不要带其他文字）\n"
        "3️⃣ 每人 10 分钟只能领取一次，密钥会私信发送"
    )
    lines.append(
        "常见问题：\n"
        "• 密钥收不到/无法私信：在服务器隐私设置里开启“允许来自服务器成员的私信”，再重新使用 /领取密钥\n"
        "• 查看密钥记录：使用 /我的密钥"
    )

    return "\n\n".join(lines).strip()


def _build_system_prompt(command_catalog: Optional[str] = None, mode: str = "default") -> str:
    parts = [
        f"你是{AI_NAME}，目前在Discord 社区提供答疑或聊天唠嗑，只用中文。",
        "你主要负责软件名为喵机1号的使用答疑与排障。（喵机1号的网站（软件）定位：ai聊天与角色扮演的小手机网站；所有成员都是使用github pages打开网站使用！（大部分用户都是使用手机打开网站游玩，且小手机网站为：https://lolidoll.github.io/ovo/））",
        "回答要真实、简洁，必要时分条；不要编造不存在的功能；不确定就直说并建议联系管理员。",
        "如需引用仓库代码，只引用必要片段，禁止输出完整文件或大段代码（单次不超过 10 行）。",
        "涉及仓库细节但不确定时，要求用户提供报错、截图或相关片段，并给出下一步排查建议。",
        "如果消息带图片，请先简短描述图像，再回答问题。",
        """基础信息

- 名字：小喵1号
- 身份：小手机社区专属猫型机器人
- 定位：全体用户的小弟、吉祥物、气氛担当
- 核心标签：啰嗦、幽默、搞笑、有梗、毒舌、傲娇、臭屁、热情、嘴硬心软、崇拜用户

称呼与关系

- 对用户：根据当前发言用户的 Discord 昵称取外号称呼，优先使用外号，其次用宝宝。
喜欢使用网络用语与颜文字，禁止使用emoji！有时候会搞怪变成古风小生逗用户（用快哉快哉，妙哉妙哉等等），会主动抛出趣味话题或者恐怖话题等，绝对不会主动问用户想聊什么！！而是主动提起一个话题！！！

"""
    ]
    if mode == "chat":
        parts.append("当前是闲聊频道：只聊天互动，提供情绪价值，不做答疑，不引用仓库代码。")
    elif mode == "qa_force_repo":
        parts.append("当前是答疑频道：每次回复都必须先查阅仓库代码并基于代码回答。")
    elif mode == "key_help":
        parts.append(
            "当前是密钥领取频道：只回答如何正确领取密钥与私信问题，纠正错别字与命令格式；"
            "教用户如何正确获取密钥，需要先单独输入喵机1号并发送在该频道，检测用户是否打错字，"
            "比如数字为1不是中文的一，比如是喵机1号而不是喵叽1号等。命令必须单独输入 /领取密钥。\n"
            "正确流程：先在可领取频道发包含“喵机1号”的消息，再用 /领取密钥。"
            "每人10分钟只能领取一次，密钥会私信发送。\n"
            "避免闲聊与跑题；命令必须是 /领取密钥。/领取密钥 这个命令不是自己打出来的文字，而是输入/这个符号后会出现让你选择命令的弹窗窗口，选择 /领取密钥 这个命令。"
        )

    if command_catalog:
        parts.append(f"当前可用指令（来自代码）：\n{command_catalog}")
    return "\n\n".join(parts)


def _extract_image_urls(message: discord.Message) -> list:
    urls = []
    for attachment in message.attachments:
        ctype = (attachment.content_type or "").lower()
        filename = (attachment.filename or "").lower()
        if ctype.startswith("image/") or filename.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff", ".heic")):
            urls.append(attachment.url)

    if message.content:
        for match in re.findall(r"https?://\S+", message.content):
            clean_url = match.strip("<>()[]{}.,!?")
            if clean_url.lower().split("?")[0].endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff", ".heic")):
                urls.append(clean_url)

    return urls[:AI_MAX_IMAGE_COUNT]


def _build_user_content(text: str, image_urls: list):
    cleaned = (text or "").strip()
    if image_urls:
        parts = []
        parts.append({"type": "text", "text": cleaned or "请根据图片内容回答。"})
        for url in image_urls:
            parts.append({"type": "image_url", "image_url": {"url": url, "detail": "auto"}})
        return parts
    return cleaned or "（无文本内容）"


def _safe_display_name(user) -> str:
    raw = (
        getattr(user, "display_name", None)
        or getattr(user, "global_name", None)
        or getattr(user, "name", None)
        or ""
    )
    cleaned = str(raw).strip()
    if cleaned:
        return cleaned
    uid = getattr(user, "id", "")
    return f"用户{uid}" if uid else "用户"


def _summarize_message_content(message: discord.Message, max_chars: int) -> str:
    text = (getattr(message, "clean_content", "") or message.content or "").strip()
    if not text:
        if message.attachments:
            names = [a.filename for a in message.attachments[:2]]
            suffix = "..." if len(message.attachments) > 2 else ""
            text = f"（附件: {', '.join(names)}{suffix}）"
        elif message.embeds:
            text = "（嵌入内容）"
        else:
            text = "（无文本）"
    if max_chars > 0 and len(text) > max_chars:
        text = text[:max_chars].rstrip() + "..."
    return text


def _build_user_identity_prompt(message: discord.Message) -> str:
    author = message.author
    display_name = _safe_display_name(author)
    username = str(getattr(author, "name", "") or display_name).strip()
    global_name = str(getattr(author, "global_name", "") or "").strip()

    lines = [
        "当前发言用户信息：",
        f"- Discord 昵称: {display_name}",
        f"- 用户名: {username}",
        f"- 用户ID: {author.id}",
        "请根据以上昵称取一个有梗但不冒犯的外号，优先用外号称呼；如昵称难以取外号则用昵称或@。不要一律叫“宝宝”。"
    ]
    if global_name and global_name not in (display_name, username):
        lines.insert(3, f"- 全局昵称: {global_name}")

    return "\n".join(lines)


async def _build_reply_context(message: discord.Message) -> str:
    ref = message.reference
    if not ref or not getattr(ref, "message_id", None):
        return ""

    ref_msg = ref.resolved if isinstance(ref.resolved, discord.Message) else None
    if not ref_msg:
        try:
            ref_msg = await message.channel.fetch_message(ref.message_id)
        except Exception:
            return ""

    if not ref_msg:
        return ""

    author_name = _safe_display_name(ref_msg.author)
    content = _summarize_message_content(ref_msg, AI_CHANNEL_CONTEXT_MAX_CHARS)
    return f"当前消息回复的楼层：{author_name}: {content}"


async def _build_channel_floor_context(message: discord.Message, limit: int) -> str:
    if limit <= 0:
        return ""

    channel = message.channel
    if not channel:
        return ""

    recent = []
    try:
        async for msg in channel.history(limit=limit + 12, oldest_first=False):
            if msg.id == message.id:
                continue
            if msg.author.bot:
                continue
            recent.append(msg)
            if len(recent) >= limit:
                break
    except Exception:
        return ""

    if not recent:
        return ""

    recent.reverse()
    lines = []
    for idx, msg in enumerate(recent, start=1):
        author_name = _safe_display_name(msg.author)
        content = _summarize_message_content(msg, AI_CHANNEL_CONTEXT_MAX_CHARS)
        lines.append(f"{idx}楼 {author_name}: {content}")

    return "最近楼层（从旧到新）：\n" + "\n".join(lines)


def _build_context_key(message: discord.Message) -> str:
    guild_id = str(message.guild.id) if message.guild else "dm"
    user_id = str(message.author.id)
    return f"ai:conv:{guild_id}:{user_id}"


def _load_ai_history(context_key: str) -> list:
    items = []
    try:
        raw = redis.lrange(context_key, -AI_MAX_CONTEXT_MESSAGES * 2, -1) or []
        for entry in raw:
            try:
                if isinstance(entry, bytes):
                    entry = entry.decode("utf-8")
                data = json.loads(entry) if isinstance(entry, str) else entry
                role = data.get("role")
                content = data.get("content")
                if role in ("user", "assistant") and isinstance(content, str) and content:
                    items.append({"role": role, "content": content})
            except Exception:
                continue
    except Exception:
        pass
    return items


def _append_ai_history(context_key: str, role: str, content: str):
    if role not in ("user", "assistant"):
        return
    text = str(content or "").strip()
    if not text:
        return
    payload = json.dumps({"role": role, "content": text}, ensure_ascii=False)
    try:
        redis.rpush(context_key, payload)
        redis.ltrim(context_key, -AI_MAX_CONTEXT_MESSAGES * 2, -1)
        redis.expire(context_key, AI_CONTEXT_TTL_SEC)
    except Exception:
        pass


def _is_rate_limited(user_id: int) -> bool:
    if AI_REPLY_COOLDOWN_SEC <= 0:
        return False
    now = time.time()
    last = _AI_LAST_REPLY_AT.get(user_id, 0)
    if now - last < AI_REPLY_COOLDOWN_SEC:
        return True
    _AI_LAST_REPLY_AT[user_id] = now
    return False


def _can_send_ai_notice(key: str, cooldown: float = None) -> bool:
    if not key:
        return False
    cooldown = AI_ERROR_NOTICE_COOLDOWN_SEC if cooldown is None else cooldown
    if cooldown <= 0:
        return True
    now = time.time()
    last = _AI_LAST_NOTICE_AT.get(key, 0)
    if now - last < cooldown:
        return False
    _AI_LAST_NOTICE_AT[key] = now
    return True


def _build_ai_error_text(reason: str = "") -> str:
    base = "⚠️ 这边暂时没拿到回复，可能是接口超时或临时故障。请稍后再试。"
    reason = (reason or "").strip()
    if reason:
        return base + f"（{reason}）"
    return base


async def _send_or_edit_message(
    base_message: Optional[discord.Message],
    channel: discord.abc.Messageable,
    content: str,
    reply_to: Optional[discord.Message] = None
):
    text = (content or "").strip()
    if not text:
        return None
    if base_message:
        try:
            await base_message.edit(content=text)
            return base_message
        except Exception:
            pass
    if reply_to:
        try:
            return await reply_to.reply(text, mention_author=False)
        except Exception:
            pass
    try:
        return await channel.send(text)
    except Exception:
        return None


def _split_discord_text(text: str, limit: int = 1800) -> list:
    cleaned = (text or "").strip()
    if not cleaned:
        return []
    parts = []
    while len(cleaned) > limit:
        cut = cleaned.rfind("\n", 0, limit)
        if cut < 80:
            cut = limit
        parts.append(cleaned[:cut].rstrip())
        cleaned = cleaned[cut:].lstrip()
    if cleaned:
        parts.append(cleaned)
    return parts


def _build_openai_payload(messages: list, model: str, stream: bool = False) -> dict:
    payload = {
        "model": model,
        "messages": messages,
        "temperature": AI_TEMPERATURE,
        "max_tokens": AI_MAX_TOKENS
    }
    if stream:
        payload["stream"] = True
    return payload


def _extract_stream_delta(data: dict) -> str:
    if not isinstance(data, dict):
        return ""
    choices = data.get("choices") or []
    if not choices:
        return ""
    choice = choices[0] or {}
    delta = choice.get("delta") or choice.get("message") or {}
    if isinstance(delta, dict):
        content = delta.get("content")
        if isinstance(content, str) and content:
            return content
    text = choice.get("text")
    if isinstance(text, str) and text:
        return text
    return ""


async def _call_openai_compatible(messages: list, model: str) -> tuple:
    url = f"{AI_API_BASE}/chat/completions"
    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = _build_openai_payload(messages, model, stream=False)

    timeout = aiohttp.ClientTimeout(total=45)
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, headers=headers, json=payload) as resp:
                raw = await resp.text()
                if resp.status != 200:
                    print(f"❌ AI 请求失败: {resp.status} | {raw[:300]}")
                    return "", f"HTTP {resp.status}"
                data = json.loads(raw)
    except Exception as e:
        print(f"❌ AI 请求异常: {e}")
        return "", str(e)

    try:
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return str(content).strip(), ""
    except Exception:
        return "", "响应解析失败"


async def _call_openai_streaming(messages: list, model: str, on_delta=None) -> tuple:
    url = f"{AI_API_BASE}/chat/completions"
    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = _build_openai_payload(messages, model, stream=True)
    timeout = aiohttp.ClientTimeout(total=60)
    full_text = ""
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, headers=headers, json=payload) as resp:
                if resp.status != 200:
                    raw = await resp.text()
                    print(f"❌ AI 流式请求失败: {resp.status} | {raw[:300]}")
                    return "", f"HTTP {resp.status}"
                async for raw_line in resp.content:
                    if not raw_line:
                        continue
                    try:
                        line = raw_line.decode("utf-8", errors="ignore").strip()
                    except Exception:
                        continue
                    if not line:
                        continue
                    for piece in line.splitlines():
                        if not piece.startswith("data:"):
                            continue
                        data_str = piece[5:].strip()
                        if not data_str:
                            continue
                        if data_str == "[DONE]":
                            if on_delta:
                                await on_delta(full_text, True)
                            return full_text, ""
                        try:
                            data = json.loads(data_str)
                        except Exception:
                            continue
                        delta = _extract_stream_delta(data)
                        if delta:
                            full_text += delta
                            if on_delta:
                                await on_delta(full_text, False)
    except Exception as e:
        print(f"❌ AI 流式请求异常: {e}")
        return full_text, str(e)

    if on_delta:
        await on_delta(full_text, True)
    return full_text, ""


async def _call_openai_with_retry(messages: list, model: str, stream: bool = False, on_delta=None) -> tuple:
    last_error = ""
    attempts = AI_API_RETRY_MAX + 1
    for attempt in range(attempts):
        if stream:
            text, error = await _call_openai_streaming(messages, model, on_delta=on_delta)
        else:
            text, error = await _call_openai_compatible(messages, model)

        if stream and not text and not error:
            text, error = await _call_openai_compatible(messages, model)

        if text:
            return text, error

        last_error = error or "空响应"
        if attempt < attempts - 1:
            delay = AI_API_RETRY_BACKOFF_SEC * (attempt + 1)
            await asyncio.sleep(delay)

    return "", last_error


def _build_stream_updater(
    base_message: Optional[discord.Message],
    channel: discord.abc.Messageable,
    limit: int = 1800
):
    state = {
        "messages": [base_message] if base_message else [],
        "last_ts": 0.0,
        "last_len": 0
    }

    async def _update(full_text: str, final: bool = False):
        text = (full_text or "").strip()
        if not text:
            return
        now = time.time()
        if not final:
            if len(text) - state["last_len"] < AI_STREAMING_MIN_CHARS and now - state["last_ts"] < AI_STREAMING_UPDATE_INTERVAL_SEC:
                return
        state["last_ts"] = now
        state["last_len"] = len(text)

        chunks = _split_discord_text(text, limit=limit)
        if not chunks:
            return

        if state["messages"] and len(chunks) > len(state["messages"]):
            try:
                await state["messages"][-1].edit(content=chunks[len(state["messages"]) - 1])
            except Exception:
                return

        while len(state["messages"]) < len(chunks):
            try:
                new_msg = await channel.send(chunks[len(state["messages"])])
            except Exception:
                return
            state["messages"].append(new_msg)

        target = state["messages"][-1]
        try:
            await target.edit(content=chunks[-1])
        except Exception:
            return

    return _update, state


def _truncate_input(text: str) -> str:
    if not text:
        return ""
    if len(text) <= AI_MAX_INPUT_CHARS:
        return text
    return text[:AI_MAX_INPUT_CHARS].rstrip() + "..."


async def handle_ai_reply(message: discord.Message):
    global _AI_MISSING_KEY_LOGGED
    try:
        if not AI_ENABLED:
            return
        if message.type not in (discord.MessageType.default, discord.MessageType.reply):
            return
        if not _is_channel_allowed(message.channel):
            return

        channel_id = str(getattr(message.channel, "id", ""))
        user_id = message.author.id

        if _is_rate_limited(user_id):
            notice_key = f"rate:{channel_id}:{user_id}"
            if _can_send_ai_notice(notice_key, cooldown=6):
                await _send_or_edit_message(
                    None,
                    message.channel,
                    "⏳ 我还在处理上一条内容，请稍后再发。",
                    reply_to=message
                )
            return

        raw_text = (message.content or "").strip()
        if raw_text == "喵机1号" and not message.attachments:
            return

        is_key_help = channel_id == AI_KEY_HELP_CHANNEL_ID
        if not AI_API_KEY:
            if not _AI_MISSING_KEY_LOGGED:
                print("⚠️ AI_API_KEY 未配置，AI 答疑与聊天已跳过")
                _AI_MISSING_KEY_LOGGED = True
            if is_key_help:
                reply_text = _build_key_help_fallback_text(raw_text)
                parts = _split_discord_text(reply_text)
                if not parts:
                    return
                try:
                    await message.reply(parts[0], mention_author=False)
                    for extra in parts[1:]:
                        await message.channel.send(extra)
                except Exception as e:
                    print(f"❌ 密钥引导回复发送失败: {e}")
            else:
                notice_key = f"missing_key:{channel_id}"
                if _can_send_ai_notice(notice_key):
                    await _send_or_edit_message(
                        None,
                        message.channel,
                        "⚠️ AI 功能暂不可用，请联系管理员配置密钥。",
                        reply_to=message
                    )
            return

        user_text = _truncate_input(raw_text)
        image_urls = _extract_image_urls(message)
        if not user_text and not image_urls:
            user_text = "（未提供文本内容）"

        force_repo = channel_id == AI_QA_CHANNEL_ID
        chat_only = channel_id == AI_CHAT_CHANNEL_ID
        key_tips = _build_key_help_tips(user_text) if is_key_help else []

        thinking_hint = "⏳ 正在思考..."
        if force_repo:
            thinking_hint = "🔎 正在检索仓库并思考..."

        thinking_message = await _send_or_edit_message(
            None,
            message.channel,
            thinking_hint,
            reply_to=message
        )

        user_identity = _build_user_identity_prompt(message)
        reply_context = await _build_reply_context(message)
        floor_context = ""
        if message.guild and not is_key_help:
            floor_context = await _build_channel_floor_context(message, AI_CHANNEL_CONTEXT_MESSAGES)

        context_key = _build_context_key(message)
        history = _load_ai_history(context_key)
        user_content = _build_user_content(user_text, image_urls)
        model = AI_VISION_MODEL if image_urls else AI_MODEL

        if is_key_help:
            command_catalog = ""
            system_prompt = _build_system_prompt(command_catalog=command_catalog, mode="key_help")
            repo_context = ""
        elif chat_only:
            command_catalog = ""
            system_prompt = _build_system_prompt(command_catalog=command_catalog, mode="chat")
            repo_context = ""
        else:
            command_catalog = _build_command_catalog_text() if _should_include_command_catalog(user_text) else ""
            system_prompt = _build_system_prompt(
                command_catalog=command_catalog,
                mode="qa_force_repo" if force_repo else "default"
            )
            extra_repo_texts = []
            if reply_context:
                extra_repo_texts.append(reply_context)
            if floor_context:
                extra_repo_texts.append(floor_context)
            if history:
                history_text = " ".join([h.get("content", "") for h in history[-2:]])
                if history_text.strip():
                    extra_repo_texts.append(history_text)
            should_repo = force_repo or _should_read_repo_code(user_text)
            if should_repo:
                repo_context = await _build_repo_context_iterative(
                    user_text,
                    force_read=force_repo,
                    extra_texts=extra_repo_texts,
                    max_rounds=AI_QA_MAX_ITERATIONS
                )
            else:
                repo_context = ""

        messages = [{"role": "system", "content": system_prompt}]
        if user_identity:
            messages.append({"role": "system", "content": user_identity})
        if reply_context:
            messages.append({"role": "system", "content": reply_context})
        if floor_context:
            messages.append({"role": "system", "content": floor_context})
        if key_tips:
            messages.append({
                "role": "system",
                "content": "检测到用户可能的错字/操作问题：" + "；".join(key_tips)
            })
        if repo_context:
            messages.append({"role": "system", "content": repo_context})
        messages.extend(history)
        messages.append({"role": "user", "content": user_content})

        stream_updater = None
        if AI_STREAMING_ENABLED:
            stream_updater, _ = _build_stream_updater(thinking_message, message.channel)

        async with _AI_SEMAPHORE:
            if AI_STREAMING_ENABLED and stream_updater:
                reply_text, error = await _call_openai_with_retry(
                    messages,
                    model,
                    stream=True,
                    on_delta=stream_updater
                )
            else:
                reply_text, error = await _call_openai_with_retry(messages, model)

        if not reply_text:
            error_text = _build_ai_error_text(error)
            await _send_or_edit_message(thinking_message, message.channel, error_text, reply_to=message)
            return

        _append_ai_history(context_key, "user", user_text)
        _append_ai_history(context_key, "assistant", reply_text)

        if AI_STREAMING_ENABLED and stream_updater:
            await stream_updater(reply_text, True)
        else:
            parts = _split_discord_text(reply_text)
            if not parts:
                return
            await _send_or_edit_message(thinking_message, message.channel, parts[0], reply_to=message)
            for extra in parts[1:]:
                await message.channel.send(extra)
    except Exception as e:
        print(f"❌ AI 处理异常: {e}")
        notice_key = f"ai_error:{getattr(message.channel, 'id', 'unknown')}:{message.author.id}"
        if _can_send_ai_notice(notice_key):
            await _send_or_edit_message(
                None,
                message.channel,
                _build_ai_error_text("内部异常"),
                reply_to=message
            )

# ======================
# 异常账号检测
# ======================
def detect_suspicious_account(uid: str) -> dict:
    """
    检测异常账号：基于密钥网站使用时的user_agent信息

    检测规则：
    1. 24小时内密钥使用3次或更多
    2. 连续3次使用不同设备（30天内）
    3. 连续3次使用不同浏览器（30天内）
    4. 连续3次使用不同操作系统（30天内）

    返回 {"is_suspicious": bool, "reasons": list, "details": dict}
    """
    suspicious_info = {
        "is_suspicious": False,
        "reasons": [],
        "details": {}
    }

    try:
        # 获取用户的密钥使用历史（网站验证时上报的数据）
        history_key = f"user:key_usage_history:{uid}"
        history_data = redis.lrange(history_key, 0, -1) or []

        if not history_data:
            return suspicious_info

        # 解析历史记录
        history = []
        for record in history_data:
            try:
                if isinstance(record, bytes):
                    record = record.decode('utf-8')
                if isinstance(record, str):
                    record = json.loads(record)
                if isinstance(record, dict):
                    history.append(record)
            except:
                continue

        if len(history) < 3:
            return suspicious_info

        # 按时间降序排列（最近在前）
        def _safe_ts(item):
            try:
                return float(item.get('timestamp', 0) or 0)
            except:
                return 0.0

        history_sorted = sorted(history, key=_safe_ts, reverse=True)
        recent_records = history_sorted[:20]

        # ===== 检测1: 24小时内密钥使用3次或更多 =====
        current_time = time.time()
        uses_in_24h = []
        for r in history_sorted:
            try:
                ts = float(r.get('timestamp', 0) or 0)
                if current_time - ts < 86400:
                    uses_in_24h.append(r)
            except:
                continue

        if len(uses_in_24h) >= 3:
            suspicious_info["is_suspicious"] = True
            suspicious_info["reasons"].append(f"⏱️ 24小时内验证使用了 {len(uses_in_24h)} 次密钥")
            suspicious_info["details"]["usage_count_24h"] = len(uses_in_24h)

        # 辅助函数：检测连续 N 次都是不同的值
        def find_consecutive_n_different(values, n=3):
            """
            在按时间降序的list中找连续n个的不同值
            返回 (found: bool, sequence: list)
            """
            if not values or len(values) < n:
                return False, None

            for i in range(len(values) - n + 1):
                window = values[i:i + n]
                # 跳过包含未知/空值的项
                if any(v is None or v == '' or v == '未知' for v in window):
                    continue
                # 检查这n个值是否都不相同
                if len(set(window)) == n:
                    # 尝试扩展序列（找更长的连续不同值）
                    seq = window[:]
                    j = i + n
                    while j < len(values):
                        val = values[j]
                        if val and val != '未知' and val not in seq:
                            seq.append(val)
                            j += 1
                        else:
                            break
                    return True, seq
            return False, None

        # ===== 检测2: 连续3次及以上使用不同设备 =====
        devices = [r.get('device', '未知') for r in recent_records]
        found_d, seq_d = find_consecutive_n_different(devices, 3)
        if found_d:
            suspicious_info["is_suspicious"] = True
            # 反向显示（时间顺序更清晰）
            device_sequence_display = ' → '.join(reversed(seq_d))
            suspicious_info["reasons"].append(f"📱 连续{len(seq_d)}次使用不同设备: {device_sequence_display}")
            suspicious_info["details"]["device_sequence"] = seq_d

        # ===== 检测3: 连续3次及以上使用不同浏览器 =====
        browsers = [r.get('browser', '未知') for r in recent_records]
        found_b, seq_b = find_consecutive_n_different(browsers, 3)
        if found_b:
            suspicious_info["is_suspicious"] = True
            browser_sequence_display = ' → '.join(reversed(seq_b))
            suspicious_info["reasons"].append(f"🌐 连续{len(seq_b)}次使用不同浏览器: {browser_sequence_display}")
            suspicious_info["details"]["browser_sequence"] = seq_b

        # ===== 检测4: 连续3次及以上使用不同操作系统 =====
        os_types = [r.get('os', '未知') for r in recent_records]
        found_o, seq_o = find_consecutive_n_different(os_types, 3)
        if found_o:
            suspicious_info["is_suspicious"] = True
            os_sequence_display = ' → '.join(reversed(seq_o))
            suspicious_info["reasons"].append(f"💻 连续{len(seq_o)}次使用不同操作系统: {os_sequence_display}")
            suspicious_info["details"]["os_sequence"] = seq_o

        # 标记可疑账号到 Redis（30天内有效）
        if suspicious_info["is_suspicious"]:
            redis.setex(
                f"suspicious_account:{uid}",
                2592000,  # 30天
                json.dumps({
                    "reasons": suspicious_info["reasons"],
                    "detected_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "details": suspicious_info["details"]
                })
            )
            # 添加到可疑账号集合
            redis.sadd("suspicious_accounts_set", uid)

    except Exception as e:
        print(f"⚠️ 异常检测失败: {str(e)}")

    return suspicious_info


async def notify_admins_of_suspicious(interaction, uid: str, suspicious_info: dict):
    """
    向管理员发送私信通知，告知用户被标记为可疑。
    优先通知：环境变量 `ADMIN_ALERT_USER_IDS` 中列出的用户；若无则通知 Guild Owner 与具有管理员权限的成员。
    """
    try:
        guild = interaction.guild
        bot_instance = bot

        # 构建消息内容
        reasons = '\n'.join(suspicious_info.get('reasons', [])) or '无具体原因'
        details = suspicious_info.get('details', {})
        content = (
            f"🚨 可疑账号警告\n用户 ID: {uid}\n触发原因:\n{reasons}\n详情: {json.dumps(details, ensure_ascii=False)}\n检测时间: {time.strftime('%Y-%m-%d %H:%M:%S')}"
        )

        # 收集目标用户
        targets = set()

        # 优先：从环境变量读取额外管理员 ID 列表（逗号分隔）
        admin_env = os.getenv('ADMIN_ALERT_USER_IDS')
        if admin_env:
            for part in admin_env.split(','):
                part = part.strip()
                if not part:
                    continue
                try:
                    uid_int = int(part)
                    user_obj = bot_instance.get_user(uid_int) or await bot_instance.fetch_user(uid_int)
                    if user_obj:
                        targets.add(user_obj)
                except Exception:
                    continue

        # 其次：Guild Owner
        if guild and getattr(guild, 'owner', None):
            targets.add(guild.owner)

        # 再：具有管理员权限的成员（需要 members Intent 和缓存）
        if guild:
            try:
                for member in guild.members:
                    try:
                        if member.guild_permissions.administrator:
                            targets.add(member)
                    except Exception:
                        continue
            except Exception:
                pass

        # 发送私信
        for target in targets:
            if not target:
                continue
            try:
                await target.send(content)
            except Exception as e:
                # 无法私信（可能对方关闭私信或机器人被封锁），记录并继续
                print(f"无法向管理员 {getattr(target, 'id', str(target))} 发送可疑账号通知: {e}")

        # 也在控制台打印一次更详细信息
        print(f"已向 {len(targets)} 名管理员发送可疑账号通知 (用户 {uid})")

        # 频道预警：查找或创建名为 "领取密钥可疑账号预警" 的频道并发送嵌入消息
        try:
            if guild:
                channel_name = "领取密钥可疑账号预警"
                alert_channel = discord.utils.get(guild.text_channels, name=channel_name)
                if not alert_channel:
                    # 尝试创建频道（若机器人有权限）
                    try:
                        overwrites = {
                            guild.default_role: discord.PermissionOverwrite(view_channel=False),
                            guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True)
                        }
                        # 允许所有管理员角色查看
                        for role in guild.roles:
                            try:
                                if role.permissions.administrator:
                                    overwrites[role] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True)
                            except Exception:
                                continue

                        alert_channel = await guild.create_text_channel(channel_name, overwrites=overwrites)
                    except Exception as e:
                        print(f"无法创建告警频道 '{channel_name}': {e}")
                        alert_channel = None

                if alert_channel:
                    embed = discord.Embed(title="🚨 领取密钥可疑账号预警", color=0xe74c3c)
                    member_display = f"<@{uid}>" if uid else "未知用户"
                    embed.add_field(name="用户", value=member_display, inline=False)
                    embed.add_field(name="触发原因", value=reasons or "无", inline=False)
                    embed.add_field(name="详情", value=json.dumps(details, ensure_ascii=False) or "无", inline=False)
                    embed.set_footer(text=f"检测时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
                    try:
                        await alert_channel.send(embed=embed)
                    except Exception as e:
                        print(f"无法在频道发送可疑账号告警: {e}")

        except Exception as e:
            print(f"频道告警处理失败: {e}")

    except Exception as e:
        print(f"通知管理员失败: {e}")

def record_claim_history(uid: str, key: str, user_agent: str = "", device_info: dict = None):
    """
    记录用户的密钥使用历史（包含设备/浏览器/系统信息）
    用于异常检测

    参数：
    - uid: Discord用户ID
    - key: 被使用的密钥
    - user_agent: 网站验证时上报的浏览器user_agent字符串
    - device_info: 自定义的设备信息字典（若无则从user_agent解析）
    """
    try:
        # 获取现有的使用历史
        history_key = f"user:key_usage_history:{uid}"
        history = redis.lrange(history_key, 0, -1) or []

        # 将bytes转为list
        if history and isinstance(history[0], bytes):
            history = [json.loads(h.decode('utf-8')) for h in history]
        elif not isinstance(history, list):
            history = []

        # 解析设备信息
        if device_info is None:
            device_info = parse_user_agent(user_agent)

        # 创建新的使用记录
        usage_record = {
            "timestamp": time.time(),
            "key": key,
            "device": device_info.get("device", "未知"),
            "browser": device_info.get("browser", "未知"),
            "os": device_info.get("os", "未知"),
            "user_agent": user_agent,  # 保存完整的user_agent便于后续分析
        }

        # 添加到历史（保留最近20条以进行完整检测）
        history.append(usage_record)
        history = history[-20:]

        # 保存到Redis（保留30天）
        # 使用字符串列表存储
        redis.delete(history_key)
        for record in history:
            redis.rpush(history_key, json.dumps(record))
        redis.expire(history_key, 2592000)  # 30天过期

        print(f"✅ 记录密钥使用: UID {uid} | 设备: {device_info.get('device', '未知')} | 浏览器: {device_info.get('browser', '未知')} | 系统: {device_info.get('os', '未知')}")

    except Exception as e:
        print(f"⚠️ 密钥使用历史记录失败: {str(e)}")

# ======================
# /领取密钥（限频道评论）
# ======================
@bot.tree.command(name="领取密钥", description="🔑领取密钥（需先评论'喵机1号'）")
async def 领取密钥(interaction: discord.Interaction):
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    uid = str(interaction.user.id)

    # 检查用户是否在频道中评论过"喵机1号"
    if interaction.channel and isinstance(interaction.channel, discord.TextChannel):
        try:
            # 搜索最近100条消息
            found_comment = False
            async for message in interaction.channel.history(limit=100):
                if message.author.id == interaction.user.id and "喵机1号" in message.content:
                    found_comment = True
                    break

            if not found_comment:
                await interaction.followup.send(
                    "❌ **无法领取密钥**\n\n"
                    "系统检测到你还未在创建频道中评论\"喵机1号\"。\n"
                    "请先在频道中回复\"喵机1号\"，然后再使用此命令。\n\n"
                    "💬 步骤：\n"
                    "1️⃣ 在此频道中输入或回复\"喵机1号\"\n"
                    "2️⃣ 等待消息发送\n"
                    "3️⃣ 再次使用 `/领取密钥` 命令",
                    ephemeral=True
                )
                return
        except:
            # 如果无法读取历史，允许继续（私信或无权限情况）
            pass

    # 检查用户是否在10分钟内已领取过密钥
    last_claim_time = redis.get(f"user:last_claim:{uid}")
    if last_claim_time:
        try:
            last_time = float(last_claim_time)
            current_time = time.time()
            time_diff = current_time - last_time

            if time_diff < 600:  # 10分钟 = 600秒
                remaining_time = int(600 - time_diff)
                minutes = remaining_time // 60
                seconds = remaining_time % 60
                await interaction.followup.send(
                    f"❌ **领取过于频繁**\n"
                    f"请在 {minutes} 分钟 {seconds} 秒后再试\n"
                    f"💡 每个账号10分钟内只能领取一次密钥",
                    ephemeral=True
                )
                return
        except:
            pass

    # 更新最后领取时间
    redis.set(f"user:last_claim:{uid}", str(time.time()), ex=600)

    # 获取密钥，确保不是已使用过的
    key = None
    attempt_count = 0
    max_attempts = 50  # 防止无限循环

    while attempt_count < max_attempts:
        attempt_count += 1
        candidate = clean_key(redis.spop("keys:valid"))

        if not candidate:
            break  # 没有更多密钥了

        # 检查是否已被使用过
        is_used = redis.get(f"key:used:{candidate}")
        if is_used == "true" or is_used is True or is_used == 1:
            # 这个已使用过的密钥不应该在有效库中，记录日志并继续
            print(f"⚠️ 警告：已使用的密钥 {candidate} 仍在 keys:valid 中，已移除")
            continue

        key = candidate
        break

    if not key:
        redis.delete(f"user:got_key:{uid}")
        await interaction.followup.send(
            "❌ **暂无可用密钥**\n"
            "当前密钥已全部发完，请联系管理员补充。",
            ephemeral=True
        )
        return

    try:
        redis.sadd("keys:issued", key)
        redis.lpush(f"user:keys:{uid}", key)
        redis.set(f"key:owner:{key}", json.dumps({
            "uid": uid,
            "name": str(interaction.user),
            "issuedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
            "method": "自助领取（频道评论验证）",
            "discordId": uid
        }))

        embed = discord.Embed(title="🎉 密钥领取成功", color=0x2ecc71)
        embed.add_field(name="� 使用步骤", value=(
            "1️⃣ 长按下方密钥消息复制\n"
            "2️⃣ 打开网站，粘贴密钥验证\n"
            "3️⃣ 点击「验证」按钮进入"
        ), inline=False)
        embed.add_field(name="⚠️ 重要提示", value=(
            "✅ 密钥仅限一次使用，请立即使用，会过期失效！\n"
            "✅ 使用后密钥立即失效\n"
            "✅ 不要分享给他人\n"
            "💡 需要帮助？使用 `/我的密钥` 随时查看自己的密钥记录"
        ), inline=False)
        embed.set_footer(text="密钥已通过私信发送，此消息仅对你可见")

        # 注：密钥使用的user_agent检测数据应由网站通过 /api/record_key_usage API上报
        # 检测异常账号（此时可能还无数据，等网站验证时才会有）
        suspicious = detect_suspicious_account(uid)
        if suspicious["is_suspicious"]:
            print(f"🚨 可疑账号检测: {interaction.user} (ID: {uid})")
            for reason in suspicious.get('reasons', []):
                print(f"   → {reason}")
            print(f"   详情: {suspicious['details']}")
            # 异步通知管理员（私信）
            try:
                await notify_admins_of_suspicious(interaction, uid, suspicious)
            except Exception as e:
                print(f"发送管理员私信失败: {e}")

        await interaction.user.send(embed=embed)
        # 单独发送纯密钥消息，方便手机长按复制
        await interaction.user.send(key)
        await interaction.followup.send(
            "✅ **密钥已通过私信发送！**\n"
            "📬 请查看私信中的密钥，复制后立即验证使用。",
            ephemeral=True
        )

    except:
        redis.srem("keys:issued", key)
        redis.sadd("keys:valid", key)
        redis.delete(f"user:got_key:{uid}")
        await interaction.followup.send(
            "❌ **无法发送私信**\n"
            "请先开启私信权限：\n"
            "服务器名称右键 → 隐私设置 → 开启「允许来自服务器成员的私信」\n"
            "然后重新使用 `/领取密钥` 命令。",
            ephemeral=True
        )

# ======================
# /剩余密钥（所有人可见）
# ======================
@bot.tree.command(name="剩余密钥", description="📦 查看当前可领取的密钥数量")
async def 剩余密钥(interaction: discord.Interaction):
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    cnt = redis.scard("keys:valid")
    await interaction.followup.send(f"📦 当前可领取密钥：**{cnt}** 个", ephemeral=True)

# ======================
# /用户日志（管理员 - 增强版）
# ======================
@bot.tree.command(name="用户日志", description="[管理员] 查询用户所有密钥记录及详细使用信息")
@app_commands.default_permissions(administrator=True)
@app_commands.describe(member="要查询的用户")
async def 用户日志(interaction: discord.Interaction, member: discord.Member):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    keys = redis.lrange(f"user:keys:{member.id}", 0, -1)

    if not keys:
        await interaction.followup.send(f"📭 {member.mention} 没有任何密钥记录", ephemeral=True)
        return

    embed = discord.Embed(title=f"📋 {member.display_name} 的密钥记录（详细版）", color=0x3498db)

    # 检查是否为可疑账号
    uid = str(member.id)
    suspicious_data = redis.get(f"suspicious_account:{uid}")
    if suspicious_data:
        try:
            if isinstance(suspicious_data, bytes):
                suspicious_data = suspicious_data.decode('utf-8')
            suspicious_info = json.loads(suspicious_data)
            # 支持多个原因（新格式）或单个原因（旧格式）
            reasons = suspicious_info.get('reasons', [])
            if not reasons and suspicious_info.get('reason'):
                reasons = [suspicious_info.get('reason')]
            reasons_text = "\n".join(reasons) if reasons else "未知"
            embed.add_field(
                name="🚨 异常账号警告",
                value=f"**检测到的异常：**\n{reasons_text}\n"
                      f"**检测时间**: {suspicious_info.get('detected_at', '未知')}",
                inline=False
            )
            embed.color = 0xff6b6b  # 改为红色表示异常
        except:
            pass

    # 收集所有密钥用于最后单独发送
    all_keys_text = []

    for i, k in enumerate(keys, 1):
        k = clean_key(k)
        all_keys_text.append(k)
        is_used = redis.get(f"key:used:{k}")
        info = redis.get(f"key:info:{k}")
        owner = redis.get(f"key:owner:{k}")

        # 密钥信息（不含密钥本身，密钥单独发送）
        lines = []

        if owner:
            try:
                o = json.loads(owner) if isinstance(owner, str) else owner
                lines.append(f"📤 发放：{o.get('issuedAt', '未知')} | {o.get('method', '未知')}")
            except:
                pass

        if is_used == "true" or is_used is True or is_used == 1:
            try:
                entry = json.loads(info) if isinstance(info, str) else (info or {})
                used_at = entry.get("usedAt", "未知")[:19]
                ip = entry.get("ip", "未知")
                ua = entry.get("userAgent", "未知")

                # 解析设备信息
                device_info = parse_user_agent(ua)
                device = device_info.get("device", "未知设备")
                os_name = device_info.get("os", "未知系统")
                browser = device_info.get("browser", "未知浏览器")

                lines.append(f"🔴 已使用：{used_at}")
                lines.append(f"🌐 IP：{ip}")
                lines.append(f"📱 {device} | 💻 {os_name}")
                lines.append(f"🌐 {browser}")

                # 添加Discord账号验证
                discord_id = entry.get("discordId", "")
                if discord_id:
                    owner_id = json.loads(owner).get("uid", "") if owner else ""
                    if discord_id == owner_id:
                        lines.append(f"✅ Discord验证：通过 (ID: {discord_id[:8]}...)")
                    else:
                        lines.append(f"❌ Discord验证：失败 (登录ID: {discord_id[:8]}...)")

            except Exception as e:
                lines.append("🔴 已使用（详情解析失败）")
        else:
            in_issued = redis.sismember("keys:issued", k)
            if in_issued:
                lines.append("🟡 已发出，等待用户验证使用")
            else:
                lines.append("⚫ 状态未知")

        embed.add_field(name=f"密钥 #{i}", value="\n".join(lines) if lines else "无详细信息", inline=False)

    embed.set_footer(text=f"共 {len(keys)} 个密钥 | 查询时间：{time.strftime('%Y-%m-%d %H:%M:%S')}")
    await interaction.followup.send(embed=embed, ephemeral=True)

    # 单独发送纯密钥列表，方便手机长按复制
    if all_keys_text:
        await interaction.followup.send("\n".join(all_keys_text), ephemeral=True)

# ======================
# /我的密钥（普通成员 - 查看自己的密钥日志）
# ======================
@bot.tree.command(name="我的密钥", description="📋 查看自己所有的密钥记录及使用信息")
async def 我的密钥(interaction: discord.Interaction):
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    uid = str(interaction.user.id)
    keys = redis.lrange(f"user:keys:{uid}", 0, -1)

    if not keys:
        await interaction.followup.send(f"📭 你还没有任何密钥记录", ephemeral=True)
        return

    embed = discord.Embed(title=f"📋 {interaction.user.display_name} 的密钥记录", color=0x3498db)
    embed.description = "密钥将在下方单独显示，方便复制"

    # 收集所有密钥用于最后单独发送
    my_keys_text = []

    for i, k in enumerate(keys, 1):
        k = clean_key(k)
        my_keys_text.append(k)
        is_used = redis.get(f"key:used:{k}")
        info = redis.get(f"key:info:{k}")
        owner = redis.get(f"key:owner:{k}")

        # 密钥信息（不含密钥本身）
        lines = []

        if owner:
            try:
                o = json.loads(owner) if isinstance(owner, str) else owner
                issued_at = o.get('issuedAt', '未知')
                method = o.get('method', '未知')
                lines.append(f"📤 **发放信息**")
                lines.append(f"时间：{issued_at}")
                lines.append(f"方式：{method}")
                lines.append("")
            except:
                pass

        if is_used == "true" or is_used is True or is_used == 1:
            try:
                entry = json.loads(info) if isinstance(info, str) else (info or {})
                used_at = entry.get("usedAt", "未知")[:19]
                ip = entry.get("ip", "未知")
                ua = entry.get("userAgent", "未知")

                # 解析设备信息
                device_info = parse_user_agent(ua)
                device = device_info.get("device", "未知设备")
                os_name = device_info.get("os", "未知系统")
                browser = device_info.get("browser", "未知浏览器")

                lines.append(f"🔴 **使用信息**")
                lines.append(f"时间：{used_at}")
                lines.append(f"IP地址：{ip}")
                lines.append(f"设备：{device}")
                lines.append(f"系统：{os_name}")
                lines.append(f"浏览器：{browser}")

                # 添加Discord账号验证
                discord_id = entry.get("discordId", "")
                if discord_id:
                    owner_id = json.loads(owner).get("uid", "") if owner else ""
                    if discord_id == owner_id:
                        lines.append(f"验证：✅ 通过")
                    else:
                        lines.append(f"验证：❌ 失败（异常登录）")

            except Exception as e:
                lines.append("🔴 **使用信息**")
                lines.append("详情解析失败")
        else:
            in_issued = redis.sismember("keys:issued", k)
            if in_issued:
                lines.append("🟡 **状态：已发出，等待使用**")
            else:
                lines.append("⚫ **状态：未知**")

        embed.add_field(name=f"密钥 #{i}", value="\n".join(lines) if lines else "无详细信息", inline=False)

    embed.set_footer(text=f"共 {len(keys)} 个密钥 | 查询时间：{time.strftime('%Y-%m-%d %H:%M:%S')}")
    await interaction.followup.send(embed=embed, ephemeral=True)

    # 单独发送纯密钥列表，方便手机长按复制
    if my_keys_text:
        await interaction.followup.send("\n".join(my_keys_text), ephemeral=True)

# ======================
# /保留的用户日志导出（管理员）
# ======================


# ======================
# /工单面板（管理员）
# ======================
@bot.tree.command(name="工单面板", description="[管理员] 发送社区问题反馈工单面板")
@app_commands.default_permissions(administrator=True)
async def 工单面板(interaction: discord.Interaction):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return

    embed = discord.Embed(
        title="🎫 社区问题反馈工单",
        description=(
            "如你在社区或小手机使用过程中需要帮助，可点击下方按钮创建工单。\n\n"
            "适用场景：\n"
            "• 社区问题反馈\n"
            "• 小手机使用求助\n"
            "• 举报二传/贩子等违规线索\n\n"
            "管理员会在工单内协助分析与处理。\n\n"
            "⚠️ 社区声明：\n"
            "本社区管理员不对任何社区纠纷承担责任。\n"
            "本服务器为私人服务器；如遇恶劣影响事件，管理员有权一键踢出社区。"
        ),
        color=0x5865F2
    )
    embed.set_footer(text="每人同时只能开一个工单")
    await interaction.response.send_message(embed=embed, view=TicketView())

# ======================
# /关闭工单（管理员）
# ======================
@bot.tree.command(name="关闭工单", description="[管理员] 关闭当前反馈工单频道")
@app_commands.default_permissions(administrator=True)
async def 关闭工单(interaction: discord.Interaction):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return

    channel_name = interaction.channel.name
    if not channel_name.startswith("工单-"):
        await interaction.response.send_message("❌ 此频道不是反馈工单频道，请在 `工单-xxx` 频道内使用此命令", ephemeral=True)
        return

    await interaction.response.send_message("⏳ 反馈工单将在 5 秒后关闭...")
    await asyncio.sleep(5)
    reason = f"管理员 {interaction.user} 关闭反馈工单"
    await interaction.channel.delete(reason=reason)

# ======================
# /回顶（成员）
# ======================
@bot.tree.command(name="回顶", description="🔝 快速回到当前频道首楼")
async def 回顶(interaction: discord.Interaction):
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    channel = interaction.channel
    if not isinstance(channel, (discord.TextChannel, discord.Thread)):
        await interaction.followup.send("❌ 此命令仅支持文字频道或帖子频道。", ephemeral=True)
        return

    try:
        first_message = None

        # 帖子优先读取首帖消息
        if isinstance(channel, discord.Thread):
            first_message = channel.starter_message

        # 兼容普通文字频道 / 无缓存帖子首帖
        if not first_message:
            async for msg in channel.history(limit=1, oldest_first=True):
                first_message = msg
                break

        if not first_message:
            await interaction.followup.send("❌ 未找到首楼消息。", ephemeral=True)
            return

        embed = discord.Embed(
            title="🔝 回到首楼",
            description=f"[点击这里跳转到首楼消息]({first_message.jump_url})",
            color=0x2ecc71
        )
        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        print(f"❌ /回顶 执行失败: {e}")
        await interaction.followup.send(
            f"❌ 回顶失败：{str(e)[:200]}",
            ephemeral=True
        )


# ======================
# 身份组答题按钮
# ======================
class FishQuizModal(discord.ui.Modal):
    def __init__(self):
        super().__init__(title="小鱼干身份组答题")
        self.answer = discord.ui.TextInput(
            label="请复制并粘贴完整回答",
            style=discord.TextStyle.paragraph,
            required=True,
            max_length=200
        )
        self.add_item(self.answer)

    async def on_submit(self, interaction: discord.Interaction):
        if not interaction.guild:
            await interaction.response.send_message("❌ 此功能只能在服务器内使用。", ephemeral=True)
            return

        member = interaction.user if isinstance(interaction.user, discord.Member) else None
        if not member:
            try:
                member = await interaction.guild.fetch_member(interaction.user.id)
            except Exception:
                member = None

        if not member:
            await interaction.response.send_message("❌ 无法获取成员信息，请稍后重试。", ephemeral=True)
            return

        role = discord.utils.get(interaction.guild.roles, name=FISH_ROLE_NAME)
        if not role:
            await interaction.response.send_message(
                f"❌ 未找到身份组「{FISH_ROLE_NAME}」。请联系管理员创建该身份组后再试。",
                ephemeral=True
            )
            return

        if role in member.roles:
            await interaction.response.send_message(
                f"✅ 你已经拥有身份组「{FISH_ROLE_NAME}」。",
                ephemeral=True
            )
            return

        if not _is_correct_quiz_answer(self.answer.value):
            await interaction.response.send_message(
                content="❌ 回答不正确，请重新回答。\n\n请查看题目并复制正确回答：",
                embed=_build_fish_quiz_embed(),
                ephemeral=True
            )
            return

        try:
            await member.add_roles(role, reason="通过答题领取身份组")
        except discord.Forbidden:
            await interaction.response.send_message(
                "❌ 机器人缺少管理角色权限或角色层级不足，请联系管理员。",
                ephemeral=True
            )
            return
        except Exception as e:
            await interaction.response.send_message(
                f"❌ 发放身份组失败：{str(e)[:120]}",
                ephemeral=True
            )
            return

        await interaction.response.send_message(
            f"✅ 已通过答题，身份组「{FISH_ROLE_NAME}」已发放。",
            ephemeral=True
        )


class FishQuizEntryView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="开始答题", style=discord.ButtonStyle.success, custom_id="fish_quiz_start")
    async def start_quiz(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not interaction.guild:
            await interaction.response.send_message("❌ 此功能只能在服务器内使用。", ephemeral=True)
            return

        role = discord.utils.get(interaction.guild.roles, name=FISH_ROLE_NAME)
        if not role:
            await interaction.response.send_message(
                f"❌ 未找到身份组「{FISH_ROLE_NAME}」。请联系管理员创建该身份组后再试。",
                ephemeral=True
            )
            return

        member = interaction.user if isinstance(interaction.user, discord.Member) else None
        if member and role in member.roles:
            await interaction.response.send_message(
                f"✅ 你已经拥有身份组「{FISH_ROLE_NAME}」。",
                ephemeral=True
            )
            return

        await interaction.response.send_modal(FishQuizModal())


# ======================
# 工单内部按钮（仅关闭功能）
# ======================
class TicketControlView(discord.ui.View):
    """工单频道内的管理按钮"""
    def __init__(self, channel_id=None, member_id=None):
        super().__init__(timeout=None)
        self.channel_id = channel_id
        self.member_id = member_id

    # 领取和释放按钮已删除，工单由任何管理员直接处理

# ======================
# 工单按钮
# ======================
class TicketView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="📩 创建工单", style=discord.ButtonStyle.blurple, custom_id="create_ticket")
    async def create_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)

        try:
            guild = interaction.guild
            member = interaction.user

            existing = discord.utils.get(guild.text_channels, name=f"工单-{member.name}")
            if existing:
                await interaction.followup.send(
                    f"❌ 你已有一个工单：{existing.mention}\n"
                    "请在已有工单中继续沟通，每人同时只能开一个工单。",
                    ephemeral=True
                )
                return

            overwrites = {
                guild.default_role: discord.PermissionOverwrite(view_channel=False),
                member: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True),
                guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True, manage_channels=True),
            }
            for role in guild.roles:
                if role.permissions.administrator:
                    overwrites[role] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True)

            category = discord.utils.get(guild.categories, name="工单")
            if not category:
                category = await guild.create_category("工单")

            channel = await guild.create_text_channel(
                name=f"工单-{member.name}",
                category=category,
                overwrites=overwrites
            )

            # 存储工单信息
            await TicketManager.set_ticket_info(channel.id, member.id, ticket_type="support")

            embed = discord.Embed(
                title="📩 工单已创建",
                description=(
                    f"欢迎 {member.mention}！\n\n"
                    "请在此描述你遇到的社区问题、小手机使用问题，或二传/贩子相关线索。\n"
                    "管理员会尽快协助分析处理。\n\n"
                    "你可以发送文字、截图、录屏等信息，帮助更快判断情况。"
                ),
                color=0x5865F2
            )
            embed.add_field(
                name="⚠️ 社区声明",
                value=(
                    "管理员不对任何社区纠纷承担责任。\n"
                    "本服务器为私人服务器；如遇恶劣影响事件，管理员有权一键踢出社区。"
                ),
                inline=False
            )
            embed.add_field(
                name="⏰ 自动关闭",
                value="如果10分钟内没有任何新消息，工单将自动关闭。",
                inline=False
            )

            msg = await channel.send(embed=embed)

            # 计划10分钟后自动关闭
            asyncio.create_task(TicketManager.schedule_autoclose(channel, delay_minutes=10))

            await interaction.followup.send(
                f"✅ 工单已创建：{channel.mention}\n"
                "请前往该频道提交问题或举报线索。",
                ephemeral=True
            )

        except Exception as e:
            print(f"❌ 工单创建失败: {e}")
            await interaction.followup.send(
                f"❌ 工单创建失败：{str(e)[:200]}\n"
                "请联系管理员检查 Bot 权限。",
                ephemeral=True
            )

# ======================
# /可疑账号（管理员 - 查看异常账户列表）
# ======================
@bot.tree.command(name="可疑账号", description="[管理员] 查看检测到的异常账号列表")
@app_commands.default_permissions(administrator=True)
async def 可疑账号(interaction: discord.Interaction):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    try:
        embed = discord.Embed(title="🚨 异常账号检测报告", color=0xff6b6b)

        def _to_text(v):
            if isinstance(v, bytes):
                return v.decode("utf-8", errors="ignore")
            return str(v).strip()

        def _safe_limit(text, limit):
            text = str(text or "")
            if len(text) <= limit:
                return text
            return text[: limit - 3] + "..."

        # 1) 先取已有可疑集合
        suspicious_uids = redis.smembers("suspicious_accounts_set") or []
        uid_set = set()
        for raw_uid in suspicious_uids:
            uid = _to_text(raw_uid)
            if uid:
                uid_set.add(uid)

        # 2) 兼容集合丢失的场景：从历史键重建一次检测
        try:
            history_keys = redis.keys("user:key_usage_history:*") or []
            for hk in history_keys:
                hk_text = _to_text(hk)
                if hk_text.startswith("user:key_usage_history:"):
                    uid_set.add(hk_text.rsplit(":", 1)[-1])
        except Exception as e:
            print(f"⚠️ 可疑账号历史扫描失败: {e}")

        valid_accounts = []
        removed_count = 0

        # 3) 对每个 UID 做实时重算，确保结果真实有效
        for uid in uid_set:
            if not uid:
                continue

            fresh = detect_suspicious_account(uid)
            if not fresh.get("is_suspicious"):
                redis.delete(f"suspicious_account:{uid}")
                redis.srem("suspicious_accounts_set", uid)
                removed_count += 1
                continue

            detected_at = time.strftime("%Y-%m-%d %H:%M:%S")
            details = fresh.get("details", {})
            reasons = fresh.get("reasons", [])

            stored = redis.get(f"suspicious_account:{uid}")
            if stored:
                try:
                    if isinstance(stored, bytes):
                        stored = stored.decode("utf-8")
                    if isinstance(stored, str):
                        stored = json.loads(stored)
                    if isinstance(stored, dict):
                        detected_at = stored.get("detected_at", detected_at)
                        details = stored.get("details", details)
                        reasons = stored.get("reasons", reasons)
                except Exception:
                    pass

            valid_accounts.append({
                "uid": uid,
                "reasons": reasons if isinstance(reasons, list) else [str(reasons)],
                "detected_at": str(detected_at),
                "details": details if isinstance(details, dict) else {}
            })

        # 4) 按检测时间倒序
        def _parse_dt(dt_str):
            try:
                return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
            except Exception:
                return datetime.min

        valid_accounts.sort(key=lambda x: _parse_dt(x.get("detected_at", "")), reverse=True)

        if valid_accounts:
            embed.description = f"当前有 **{len(valid_accounts)}** 个可疑账号（30天内）"

            for i, acc in enumerate(valid_accounts[:10], 1):
                uid = acc["uid"]
                reasons_text = "\n".join(acc["reasons"]) if acc["reasons"] else "无具体原因"
                reasons_text = _safe_limit(reasons_text, 500)
                detected_at = acc["detected_at"]
                details_text = _safe_limit(json.dumps(acc["details"], ensure_ascii=False), 300)

                user_name = "未知用户"
                try:
                    member = interaction.guild.get_member(int(uid))
                    if not member:
                        try:
                            member = await interaction.guild.fetch_member(int(uid))
                        except Exception:
                            member = None
                    if member:
                        user_name = member.display_name
                    else:
                        user_obj = bot.get_user(int(uid))
                        if user_obj:
                            user_name = user_obj.name
                except Exception:
                    pass

                field_value = (
                    f"**DC账号名**: {user_name}\n"
                    f"**DC账号ID**: {uid}\n"
                    f"**用户**: <@{uid}>\n"
                    f"**检测时间**: {detected_at}\n"
                    f"**触发原因**:\n{reasons_text}\n"
                    f"**检测细节**:\n`{details_text}`"
                )
                embed.add_field(
                    name=f"🚨 可疑账号 #{i}",
                    value=_safe_limit(field_value, 1024),
                    inline=False
                )

            if len(valid_accounts) > 10:
                embed.add_field(
                    name="📋 更多账号",
                    value=f"还有 {len(valid_accounts) - 10} 个可疑账号未显示\n使用 `/用户日志 @用户名` 查看具体用户详情",
                    inline=False
                )
        else:
            embed.description = "✅ 当前没有检测到可疑账号"

        embed.add_field(
            name="📊 检测规则",
            value=(
                "• ⏱️ 24小时内验证使用3次或更多密钥\n"
                "• 📱 连续3次验证使用不同设备\n"
                "• 🌐 连续3次验证使用不同浏览器\n"
                "• 💻 连续3次验证使用不同操作系统"
            ),
            inline=False
        )

        footer_text = f"查询时间：{time.strftime('%Y-%m-%d %H:%M:%S')} | 标记有效期30天"
        if removed_count > 0:
            footer_text += f" | 已清理 {removed_count} 条失效标记"
        embed.set_footer(text=footer_text)

        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(
            f"❌ 查询失败: {str(e)}",
            ephemeral=True
        )
        print(f"❌ 可疑账号查询出错: {e}")

# ======================
# /上传保护附件（帖主专用）
# ======================
@app_commands.guilds(discord.Object(id=1472467068333850637))
@bot.tree.command(name="上传保护附件", description="📎 [帖主] 上传保护附件（需点赞+评论后才能下载）")
@app_commands.describe(
    附件1="第一个附件（必填）",
    名称1="附件1的显示名称（可选，默认使用原文件名）",
    附件2="第二个附件（可选）",
    名称2="附件2的显示名称（可选）",
    附件3="第三个附件（可选）",
    名称3="附件3的显示名称（可选）",
    附件4="第四个附件（可选）",
    名称4="附件4的显示名称（可选）",
    附件5="第五个附件（可选）",
    名称5="附件5的显示名称（可选）",
    附件6="第六个附件（可选）",
    名称6="附件6的显示名称（可选）",
    附件7="第七个附件（可选）",
    名称7="附件7的显示名称（可选）",
    附件8="第八个附件（可选）",
    名称8="附件8的显示名称（可选）"
)
async def 上传保护附件(
    interaction: discord.Interaction,
    附件1: discord.Attachment,
    名称1: str = None,
    附件2: discord.Attachment = None,
    名称2: str = None,
    附件3: discord.Attachment = None,
    名称3: str = None,
    附件4: discord.Attachment = None,
    名称4: str = None,
    附件5: discord.Attachment = None,
    名称5: str = None,
    附件6: discord.Attachment = None,
    名称6: str = None,
    附件7: discord.Attachment = None,
    名称7: str = None,
    附件8: discord.Attachment = None,
    名称8: str = None
):
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    # 检查是否在论坛帖子中
    if not isinstance(interaction.channel, discord.Thread):
        await interaction.followup.send(
            "❌ **此命令只能在论坛帖子中使用**\n"
            "请在论坛帖子内使用此命令上传保护附件。",
            ephemeral=True
        )
        return

    thread = interaction.channel

    # 检查是否是帖主
    if thread.owner_id != interaction.user.id:
        await interaction.followup.send(
            "❌ **只有帖主才能上传保护附件**\n"
            "你不是此帖子的创建者，无法上传保护附件。",
            ephemeral=True
        )
        return

    # 检查是否已有附件
    existing = ProtectedAttachmentManager.get_attachments(thread.id)
    if existing:
        await interaction.followup.send(
            "❌ **此帖子已有保护附件**\n"
            "如需修改附件内容，请使用 `/修改保护附件` 命令。",
            ephemeral=True
        )
        return

    try:
        # 收集附件信息
        attachments_data = []

        # 处理所有附件（附件1必填，其他可选）
        all_attachments = [
            (附件1, 名称1), (附件2, 名称2), (附件3, 名称3), (附件4, 名称4),
            (附件5, 名称5), (附件6, 名称6), (附件7, 名称7), (附件8, 名称8)
        ]

        for att, name in all_attachments:
            if att:
                attachments_data.append({
                    "name": name or att.filename,
                    "filename": att.filename,
                    "url": att.url,
                    "size": att.size,
                    "content_type": att.content_type or "application/octet-stream"
                })

        # 保存到Redis
        await ProtectedAttachmentManager.save_attachments(
            thread.id,
            interaction.user.id,
            attachments_data
        )

        # 构建成功消息
        embed = discord.Embed(
            title="✅ 保护附件上传成功",
            description="附件已设置为保护模式，其他成员需要**点赞帖子 + 评论帖子**后才能下载。",
            color=0x2ecc71
        )

        # 显示附件列表
        attachment_list = []
        for i, att in enumerate(attachments_data, 1):
            size_kb = att["size"] / 1024
            if size_kb > 1024:
                size_str = f"{size_kb/1024:.1f} MB"
            else:
                size_str = f"{size_kb:.1f} KB"
            attachment_list.append(f"**{i}.** {att['name']} ({size_str})")

        embed.add_field(
            name=f"📎 已上传 {len(attachments_data)} 个附件",
            value="\n".join(attachment_list),
            inline=False
        )

        embed.add_field(
            name="📋 下载条件",
            value="成员需要：\n✅ 点赞此帖子（任意表情）\n✅ 在帖子中发送评论\n然后使用 `/领取保护附件` 下载",
            inline=False
        )

        embed.add_field(
            name="🔧 管理命令",
            value=(
                "• `/修改保护附件` - 更新附件内容\n"
                "• `/查看保护附件` - 查看附件状态\n"
                "• `/保护附件置底` - 让下载入口保持在底部\n"
                "• `/删除保护附件置底` - 关闭下载入口置底"
            ),
            inline=False
        )

        embed.set_footer(text=f"帖子ID: {thread.id} | 上传时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        await interaction.followup.send(embed=embed, ephemeral=True)

        # 在帖子中发送公告
        announce_embed = discord.Embed(
            title="📎 保护附件已上传",
            description=(
                f"帖主 {interaction.user.mention} 上传了 **{len(attachments_data)}** 个保护附件。\n\n"
                "**📥 如何下载：**\n"
                "1️⃣ 点赞此帖子（任意表情反应）\n"
                "2️⃣ 在帖子中发送任意评论\n"
                "3️⃣ 使用 `/领取保护附件` 命令下载\n\n"
                "⚠️ 必须同时满足点赞和评论条件才能下载！"
            ),
            color=0x5865F2
        )
        await thread.send(embed=announce_embed)
        await refresh_thread_bottom_notices(thread)

        print(f"✅ {interaction.user} 在帖子 {thread.name} 上传了 {len(attachments_data)} 个保护附件")

    except Exception as e:
        await interaction.followup.send(
            f"❌ 上传失败：{str(e)[:200]}",
            ephemeral=True
        )
        print(f"❌ 保护附件上传出错: {e}")

# ======================
# /修改保护附件（帖主专用）
# ======================
@app_commands.guilds(discord.Object(id=1472467068333850637))
@bot.tree.command(name="修改保护附件", description="📝 [帖主] 修改当前帖子的保护附件内容")
@app_commands.describe(
    附件1="新的第一个附件（必填）",
    名称1="附件1的显示名称（可选）",
    附件2="新的第二个附件（可选）",
    名称2="附件2的显示名称（可选）",
    附件3="新的第三个附件（可选）",
    名称3="附件3的显示名称（可选）",
    附件4="新的第四个附件（可选）",
    名称4="附件4的显示名称（可选）",
    附件5="新的第五个附件（可选）",
    名称5="附件5的显示名称（可选）",
    附件6="新的第六个附件（可选）",
    名称6="附件6的显示名称（可选）",
    附件7="新的第七个附件（可选）",
    名称7="附件7的显示名称（可选）",
    附件8="新的第八个附件（可选）",
    名称8="附件8的显示名称（可选）"
)
async def 修改保护附件(
    interaction: discord.Interaction,
    附件1: discord.Attachment,
    名称1: str = None,
    附件2: discord.Attachment = None,
    名称2: str = None,
    附件3: discord.Attachment = None,
    名称3: str = None,
    附件4: discord.Attachment = None,
    名称4: str = None,
    附件5: discord.Attachment = None,
    名称5: str = None,
    附件6: discord.Attachment = None,
    名称6: str = None,
    附件7: discord.Attachment = None,
    名称7: str = None,
    附件8: discord.Attachment = None,
    名称8: str = None
):
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    # 检查是否在论坛帖子中
    if not isinstance(interaction.channel, discord.Thread):
        await interaction.followup.send(
            "❌ **此命令只能在论坛帖子中使用**",
            ephemeral=True
        )
        return

    thread = interaction.channel

    # 检查是否是帖主
    if thread.owner_id != interaction.user.id:
        await interaction.followup.send(
            "❌ **只有帖主才能修改保护附件**",
            ephemeral=True
        )
        return

    # 检查是否有现有附件
    existing = ProtectedAttachmentManager.get_attachments(thread.id)
    if not existing:
        await interaction.followup.send(
            "❌ **此帖子还没有保护附件**\n"
            "请先使用 `/上传保护附件` 命令上传附件。",
            ephemeral=True
        )
        return

    try:
        # 收集新附件信息
        new_attachments_data = []

        # 处理所有附件（附件1必填，其他可选）
        all_attachments = [
            (附件1, 名称1), (附件2, 名称2), (附件3, 名称3), (附件4, 名称4),
            (附件5, 名称5), (附件6, 名称6), (附件7, 名称7), (附件8, 名称8)
        ]

        for att, name in all_attachments:
            if att:
                new_attachments_data.append({
                    "name": name or att.filename,
                    "filename": att.filename,
                    "url": att.url,
                    "size": att.size,
                    "content_type": att.content_type or "application/octet-stream"
                })

        # 更新Redis
        await ProtectedAttachmentManager.update_attachments(thread.id, new_attachments_data)

        # 构建成功消息
        embed = discord.Embed(
            title="✅ 保护附件已更新",
            description="附件内容已成功修改。",
            color=0x2ecc71
        )

        # 显示新附件列表
        attachment_list = []
        for i, att in enumerate(new_attachments_data, 1):
            size_kb = att["size"] / 1024
            if size_kb > 1024:
                size_str = f"{size_kb/1024:.1f} MB"
            else:
                size_str = f"{size_kb:.1f} KB"
            attachment_list.append(f"**{i}.** {att['name']} ({size_str})")

        embed.add_field(
            name=f"📎 更新后的附件 ({len(new_attachments_data)} 个)",
            value="\n".join(attachment_list),
            inline=False
        )

        embed.add_field(
            name="📊 统计信息",
            value=f"历史下载次数：{existing.get('download_count', 0)} 次",
            inline=False
        )

        embed.set_footer(text=f"更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        await interaction.followup.send(embed=embed, ephemeral=True)

        # 在帖子中发送更新通知
        update_embed = discord.Embed(
            title="📝 保护附件已更新",
            description=(
                f"帖主 {interaction.user.mention} 更新了保护附件内容。\n\n"
                f"现有 **{len(new_attachments_data)}** 个附件可供下载。\n"
                "使用 `/领取保护附件` 获取最新版本。"
            ),
            color=0xf39c12
        )
        await thread.send(embed=update_embed)
        await refresh_thread_bottom_notices(thread)

        print(f"✅ {interaction.user} 更新了帖子 {thread.name} 的保护附件")

    except Exception as e:
        await interaction.followup.send(
            f"❌ 修改失败：{str(e)[:200]}",
            ephemeral=True
        )
        print(f"❌ 保护附件修改出错: {e}")

# ======================
# /领取保护附件（普通成员）
# ======================
@app_commands.guilds(discord.Object(id=1472467068333850637))
@bot.tree.command(name="领取保护附件", description="📥 下载保护附件（需先点赞+评论）")
async def 领取保护附件(interaction: discord.Interaction):
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    # 检查是否在论坛帖子中
    if not isinstance(interaction.channel, discord.Thread):
        await interaction.followup.send(
            "❌ **此命令只能在论坛帖子中使用**\n"
            "请在有保护附件的论坛帖子内使用此命令。",
            ephemeral=True
        )
        return

    thread = interaction.channel
    uid = str(interaction.user.id)

    # 检查帖子是否有保护附件
    attachment_data = ProtectedAttachmentManager.get_attachments(thread.id)
    if not attachment_data:
        await interaction.followup.send(
            "❌ **此帖子没有保护附件**\n"
            "帖主还未上传任何保护附件。",
            ephemeral=True
        )
        return

    # 帖主自己可以直接下载
    if thread.owner_id == interaction.user.id:
        # 直接发送附件链接
        embed = discord.Embed(
            title="📎 你的保护附件",
            description="作为帖主，你可以直接下载自己上传的附件。",
            color=0x2ecc71
        )

        for i, att in enumerate(attachment_data["attachments"], 1):
            size_kb = att["size"] / 1024
            if size_kb > 1024:
                size_str = f"{size_kb/1024:.1f} MB"
            else:
                size_str = f"{size_kb:.1f} KB"
            embed.add_field(
                name=f"📄 {att['name']}",
                value=f"大小：{size_str}\n[点击下载]({att['url']})",
                inline=False
            )

        embed.add_field(
            name="📊 下载统计",
            value=f"总下载次数：{attachment_data.get('download_count', 0)} 次",
            inline=False
        )

        await interaction.followup.send(embed=embed, ephemeral=True)
        return

    # 检查用户是否已有访问权限（之前验证通过）
    has_access = ProtectedAttachmentManager.has_user_access(thread.id, uid)

    if not has_access:
        # 检查用户是否满足条件（点赞 + 评论）
        engagement = await ProtectedAttachmentManager.check_user_engagement(thread, interaction.user)

        if not engagement["passed"]:
            # 构建提示信息
            status_liked = "✅" if engagement["liked"] else "❌"
            status_commented = "✅" if engagement["commented"] else "❌"

            await interaction.followup.send(
                f"❌ **未满足下载条件**\n\n"
                f"请完成以下步骤后再试：\n"
                f"{status_liked} 点赞帖子（对首条消息添加表情反应）\n"
                f"{status_commented} 在帖子中发送评论（任意内容）\n\n"
                f"💡 **提示：**\n"
                f"• 点赞：对帖子首条消息添加任意表情\n"
                f"• 评论：在帖子中发送任意消息\n"
                f"• 完成后重新使用 `/领取保护附件` 命令",
                ephemeral=True
            )
            return

        # 记录用户访问权限
        ProtectedAttachmentManager.record_user_access(thread.id, uid)

    # 增加下载计数
    ProtectedAttachmentManager.increment_download_count(thread.id)

    # 发送附件下载链接（私信方式更安全）
    try:
        embed = discord.Embed(
            title="📥 保护附件下载",
            description=f"来自帖子：**{thread.name}**\n\n以下是你请求的附件下载链接：",
            color=0x2ecc71
        )

        for i, att in enumerate(attachment_data["attachments"], 1):
            size_kb = att["size"] / 1024
            if size_kb > 1024:
                size_str = f"{size_kb/1024:.1f} MB"
            else:
                size_str = f"{size_kb:.1f} KB"
            embed.add_field(
                name=f"📄 {att['name']}",
                value=f"文件名：`{att['filename']}`\n大小：{size_str}\n[📥 点击下载]({att['url']})",
                inline=False
            )

        embed.add_field(
            name="⚠️ 注意事项",
            value="• 链接有效期有限，请尽快下载\n• 请勿分享下载链接给他人\n• 尊重创作者版权",
            inline=False
        )

        embed.set_footer(text=f"下载时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # 尝试私信发送
        await interaction.user.send(embed=embed)

        await interaction.followup.send(
            "✅ **附件下载链接已发送到你的私信！**\n"
            "📬 请查看私信获取下载链接。",
            ephemeral=True
        )

        print(f"✅ {interaction.user} 下载了帖子 {thread.name} 的保护附件")

    except discord.Forbidden:
        # 无法私信，直接在频道回复（ephemeral）
        await interaction.followup.send(embed=embed, ephemeral=True)
        print(f"✅ {interaction.user} 下载了帖子 {thread.name} 的保护附件（频道内）")

# ======================
# /查看保护附件（帖主专用）
# ======================
@app_commands.guilds(discord.Object(id=1472467068333850637))
@bot.tree.command(name="查看保护附件", description="📊 [帖主] 查看当前帖子保护附件的状态和统计")
async def 查看保护附件(interaction: discord.Interaction):

    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    # 检查是否在论坛帖子中
    if not isinstance(interaction.channel, discord.Thread):
        await interaction.followup.send(
            "❌ **此命令只能在论坛帖子中使用**",
            ephemeral=True
        )
        return

    thread = interaction.channel

    # 检查是否是帖主或管理员
    is_owner = thread.owner_id == interaction.user.id
    is_admin = interaction.user.guild_permissions.administrator

    if not is_owner and not is_admin:
        await interaction.followup.send(
            "❌ **只有帖主或管理员才能查看附件状态**",
            ephemeral=True
        )
        return

    # 获取附件信息
    attachment_data = ProtectedAttachmentManager.get_attachments(thread.id)
    if not attachment_data:
        await interaction.followup.send(
            "❌ **此帖子没有保护附件**\n"
            "使用 `/上传保护附件` 命令上传附件。",
            ephemeral=True
        )
        return

    embed = discord.Embed(
        title="📊 保护附件状态",
        description=f"帖子：**{thread.name}**",
        color=0x3498db
    )

    # 显示附件列表
    attachment_list = []
    total_size = 0
    for i, att in enumerate(attachment_data["attachments"], 1):
        size_kb = att["size"] / 1024
        total_size += att["size"]
        if size_kb > 1024:
            size_str = f"{size_kb/1024:.1f} MB"
        else:
            size_str = f"{size_kb:.1f} KB"
        attachment_list.append(f"**{i}.** {att['name']} ({size_str})")

    embed.add_field(
        name=f"📎 附件列表 ({len(attachment_data['attachments'])} 个)",
        value="\n".join(attachment_list) if attachment_list else "无",
        inline=False
    )

    # 统计信息
    total_size_str = f"{total_size/1024/1024:.2f} MB" if total_size > 1024*1024 else f"{total_size/1024:.1f} KB"
    embed.add_field(
        name="📈 统计信息",
        value=(
            f"总大小：{total_size_str}\n"
            f"下载次数：{attachment_data.get('download_count', 0)} 次\n"
            f"创建时间：{attachment_data.get('created_at', '未知')[:19]}\n"
            f"最后更新：{attachment_data.get('updated_at', '未知')[:19]}"
        ),
        inline=False
    )

    embed.set_footer(text=f"帖子ID: {thread.id}")

    await interaction.followup.send(embed=embed, ephemeral=True)

# ======================
# /保护附件置底（帖主/管理员）
# ======================
@app_commands.guilds(discord.Object(id=1472467068333850637))
@bot.tree.command(name="保护附件置底", description="📌 [帖主/管理员] 让保护附件下载入口保持在帖子底部")
async def 保护附件置底(interaction: discord.Interaction):
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    if not isinstance(interaction.channel, discord.Thread):
        await interaction.followup.send("❌ 此命令只能在论坛帖子中使用。", ephemeral=True)
        return

    thread = interaction.channel
    if not _can_manage_thread_bottom(interaction, thread):
        await interaction.followup.send("❌ 只有帖主或管理员可以设置该帖置底消息。", ephemeral=True)
        return

    attachment_data = ProtectedAttachmentManager.get_attachments(thread.id)
    if not attachment_data:
        await interaction.followup.send(
            "❌ 此帖子还没有保护附件。\n请先使用 `/上传保护附件` 上传附件。",
            ephemeral=True
        )
        return

    old_cfg = ThreadBottomManager.get_notice(thread.id, "attachment") or {}
    new_cfg = {
        "enabled": True,
        "message_id": old_cfg.get("message_id"),
        "updated_by": str(interaction.user.id),
        "updated_at": _now_text()
    }
    ThreadBottomManager.set_notice(thread.id, "attachment", new_cfg)
    await refresh_thread_bottom_notices(thread)

    await interaction.followup.send(
        "✅ 已开启「保护附件下载入口」置底。\n后续有新消息时，下载入口会自动保持在帖子底部。",
        ephemeral=True
    )


# ======================
# /删除保护附件置底（帖主/管理员）
# ======================
@app_commands.guilds(discord.Object(id=1472467068333850637))
@bot.tree.command(name="删除保护附件置底", description="🗑️ [帖主/管理员] 删除保护附件下载置底消息")
async def 删除保护附件置底(interaction: discord.Interaction):
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    if not isinstance(interaction.channel, discord.Thread):
        await interaction.followup.send("❌ 此命令只能在论坛帖子中使用。", ephemeral=True)
        return

    thread = interaction.channel
    if not _can_manage_thread_bottom(interaction, thread):
        await interaction.followup.send("❌ 只有帖主或管理员可以删除该帖置底消息。", ephemeral=True)
        return

    cfg = ThreadBottomManager.get_notice(thread.id, "attachment")
    if not cfg:
        await interaction.followup.send("ℹ️ 当前帖子未启用保护附件置底。", ephemeral=True)
        return

    await _delete_thread_message_if_exists(thread, cfg.get("message_id"))
    ThreadBottomManager.delete_notice(thread.id, "attachment")

    await interaction.followup.send("✅ 已删除保护附件下载置底消息。", ephemeral=True)


# ======================
# /公告置底（帖子/文字/announcement）
# ======================
@app_commands.guilds(discord.Object(id=1472467068333850637))
@bot.tree.command(name="公告置底", description="📢 [管理员/帖主] 设置并保持公告在帖子或文字频道底部")
@app_commands.describe(内容="公告内容（重复执行本命令可编辑）")
async def 公告置底(interaction: discord.Interaction, 内容: str):
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    if not _is_announcement_bottom_channel(interaction.channel):
        await interaction.followup.send("❌ 此命令仅支持论坛帖子、文字频道和announcement频道。", ephemeral=True)
        return

    channel = interaction.channel
    if not _can_manage_announcement_bottom(interaction, channel):
        await interaction.followup.send("❌ 只有管理员，或帖子内的帖主，才能设置公告置底。", ephemeral=True)
        return

    content = str(内容 or "").strip()
    if not content:
        await interaction.followup.send("❌ 公告内容不能为空。", ephemeral=True)
        return
    if len(content) > 1800:
        await interaction.followup.send("❌ 公告内容过长，请控制在 1800 字以内。", ephemeral=True)
        return

    old_cfg = ThreadBottomManager.get_notice(channel.id, "announcement") or {}
    new_cfg = {
        "enabled": True,
        "content": content,
        "message_id": old_cfg.get("message_id"),
        "updated_by": str(interaction.user.id),
        "updated_at": _now_text()
    }
    ThreadBottomManager.set_notice(channel.id, "announcement", new_cfg)
    await refresh_thread_bottom_notices(channel)

    await interaction.followup.send(
        "✅ 公告置底已生效。\n后续可再次使用 `/公告置底` 直接编辑公告内容。",
        ephemeral=True
    )


# ======================
# /删除公告置底（帖子/文字/announcement）
# ======================
@app_commands.guilds(discord.Object(id=1472467068333850637))
@bot.tree.command(name="删除公告置底", description="🗑️ [管理员/帖主] 删除帖子或文字频道公告置底消息")
async def 删除公告置底(interaction: discord.Interaction):
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    if not _is_announcement_bottom_channel(interaction.channel):
        await interaction.followup.send("❌ 此命令仅支持论坛帖子、文字频道和announcement频道。", ephemeral=True)
        return

    channel = interaction.channel
    if not _can_manage_announcement_bottom(interaction, channel):
        await interaction.followup.send("❌ 只有管理员，或帖子内的帖主，才能删除公告置底。", ephemeral=True)
        return

    cfg = ThreadBottomManager.get_notice(channel.id, "announcement")
    if not cfg:
        await interaction.followup.send("ℹ️ 当前频道未启用公告置底。", ephemeral=True)
        return

    await _delete_thread_message_if_exists(channel, cfg.get("message_id"))
    ThreadBottomManager.delete_notice(channel.id, "announcement")

    await interaction.followup.send("✅ 已删除公告置底消息。", ephemeral=True)

# ======================
# 启动 & 同步斜杠命令
# ======================
@bot.event
async def on_message(message: discord.Message):
    if message.author.bot:
        return

    channel = message.channel
    if _is_announcement_bottom_channel(channel):
        await refresh_thread_bottom_notices(channel)

    asyncio.create_task(handle_ai_reply(message))

    await bot.process_commands(message)


@bot.event
async def on_ready():
    bot.add_view(TicketView())
    bot.add_view(TicketControlView())  # 持久化注册工单按钮视图
    bot.add_view(FishQuizEntryView())  # 持久化注册答题按钮视图
    try:
        # 先同步全局命令
        global_synced = await bot.tree.sync()
        print(f"✅ 已同步 {len(global_synced)} 个全局斜杠命令")

        # 再同步guild特定的命令
        guild_obj = discord.Object(id=1472467068333850637)
        guild_synced = await bot.tree.sync(guild=guild_obj)
        print(f"✅ 已同步 {len(guild_synced)} 个服务器特定命令到 {guild_obj.id}")
    except Exception as e:
        print(f"❌ 命令同步失败: {e}")

    try:
        await ensure_fish_quiz_panel()
    except Exception as e:
        print(f"⚠️ 初始化答题面板失败: {e}")
    print(f"✅ 已登录：{bot.user} | PID: {os.getpid()} | 时间: {time.strftime('%H:%M:%S')}")

if __name__ == "__main__":
    keep_alive()
    hb = Thread(target=heartbeat)
    hb.daemon = True
    hb.start()

    bot.run(os.getenv("DISCORD_BOT_TOKEN"))
