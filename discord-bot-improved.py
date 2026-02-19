import os
import json
import asyncio
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
# 工单管理器
# ----------------------
class TicketManager:
    """处理工单的自动关闭和领取逻辑"""
    
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
    def claim_ticket(channel_id, admin_id):
        """管理员领取工单"""
        ticket_key = TicketManager.get_ticket_key(channel_id)
        info = TicketManager.get_ticket_info(channel_id)
        if info:
            info["claimed_by"] = str(admin_id)
            info["status"] = "claimed"
            redis.set(ticket_key, json.dumps(info), ex=86400)
            return True
        return False
    
    @staticmethod
    def release_ticket(channel_id):
        """释放工单（管理员取消领取）"""
        ticket_key = TicketManager.get_ticket_key(channel_id)
        info = TicketManager.get_ticket_info(channel_id)
        if info:
            info["claimed_by"] = None
            info["status"] = "open"
            redis.set(ticket_key, json.dumps(info), ex=86400)
            return True
        return False
    
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
                    description="由于10分钟内没有新消息，工单已自动关闭。\n\n如需重新提交，请使用 `/工单面板` 或 `/社区审核面板`。",
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

# ======================
# /领取密钥（限频道评论）
# ======================
@bot.tree.command(name="领取密钥", description="🔑 领取一个专属密钥（需先在频道评论'喵机1号'）")
@app_commands.default_permissions()
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

    already = redis.set(f"user:got_key:{uid}", "1", nx=True)
    if not already:
        await interaction.followup.send(
            "❌ **你已经领取过密钥了**\n"
            "每个账号只能领取一次，请查看之前的私信获取你的密钥。\n"
            "如果密钥失效或需重复领取，请创建工单等待管理员手动发放。",
            ephemeral=True
        )
        return

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
            "method": "自助领取（频道评论验证）"
        }))

        embed = discord.Embed(title="🎉 密钥领取成功", color=0x2ecc71)
        embed.add_field(name="🔑 你的专属密钥", value=f"```{key}```", inline=False)
        embed.add_field(name="📋 使用方法", value=(
            "1️⃣ 复制上方密钥\n"
            "2️⃣ 打开网站，在弹出的验证框中粘贴密钥\n"
            "3️⃣ 点击「验证」按钮即可进入"
        ), inline=False)
        embed.add_field(name="⚠️ 注意事项", value=(
            "• 每个密钥只能使用一次，使用后立即失效\n"
            "• 请尽快使用，不要分享给他人\n"
            "• 如遇问题请创建工单联系管理员"
        ), inline=False)
        embed.set_footer(text="密钥由系统自动分配，请妥善保管")

        await interaction.user.send(embed=embed)
        await interaction.followup.send(
            "✅ **密钥已通过私信发送！**\n"
            "📬 请查看私信获取密钥，并尽快使用。",
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
@app_commands.default_permissions()
async def 剩余密钥(interaction: discord.Interaction):
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    cnt = redis.scard("keys:valid")
    await interaction.followup.send(f"📦 当前可领取密钥：**{cnt}** 个", ephemeral=True)

# ======================
# /添加密钥（管理员）
# ======================
@bot.tree.command(name="添加密钥", description="[管理员] 添加一个新密钥到有效库")
@app_commands.default_permissions(administrator=True)
@app_commands.describe(key="要添加的密钥内容")
async def 添加密钥(interaction: discord.Interaction, key: str):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    key = clean_key(key)
    
    # 检查密钥是否已被使用过
    is_used = redis.get(f"key:used:{key}")
    if is_used == "true" or is_used is True or is_used == 1:
        await interaction.followup.send(
            f"❌ 无法添加密钥\n"
            f"原因：密钥 `{key}` 已被使用过，不能再加入有效库\n\n"
            f"💡 如需重复使用此密钥，请先使用 `/重置密钥` 命令重置它",
            ephemeral=True
        )
        return
    
    redis.sadd("keys:valid", key)
    redis.delete(f"key:used:{key}")
    redis.srem("keys:issued", key)
    cnt = redis.scard("keys:valid")
    await interaction.followup.send(
        f"✅ 密钥 `{key}` 已添加到有效库\n"
        f"📦 当前可用密钥总数：**{cnt}** 个",
        ephemeral=True
    )

# ======================
# /检查密钥（管理员）
# ======================
@bot.tree.command(name="检查密钥", description="[管理员] 查看密钥当前状态")
@app_commands.default_permissions(administrator=True)
@app_commands.describe(key="要检查的密钥")
async def 检查密钥(interaction: discord.Interaction, key: str):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    key = clean_key(key)
    in_valid = redis.sismember("keys:valid", key)
    in_issued = redis.sismember("keys:issued", key)
    is_used = redis.get(f"key:used:{key}")

    if is_used == "true":
        status = "🔴 已使用（已失效）"
    elif in_issued:
        status = "🟡 已发出（待验证）"
    elif in_valid:
        status = "🟢 可用（未领取）"
    else:
        status = "⚫ 不存在"

    msg = [
        f"🔑 密钥：`{key}`",
        f"📌 状态：{status}",
        f"在有效库：{'是' if in_valid else '否'}",
        f"已发出：{'是' if in_issued else '否'}",
        f"已使用：{'是' if is_used == 'true' else '否'}"
    ]

    color = 0x00ff00 if (in_valid or in_issued) and is_used != "true" else 0xff0000
    embed = discord.Embed(title="🔍 密钥状态检查", color=color)
    embed.add_field(name="详情", value="\n".join(msg), inline=False)
    await interaction.followup.send(embed=embed, ephemeral=True)

# ======================
# /密钥日志（管理员 - 增强版）
# ======================
@bot.tree.command(name="密钥日志", description="[管理员] 查看密钥完整使用日志（设备信息详细）")
@app_commands.default_permissions(administrator=True)
@app_commands.describe(key="要查询的密钥")
async def 密钥日志(interaction: discord.Interaction, key: str):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    key = clean_key(key)
    info = redis.get(f"key:info:{key}")
    owner = redis.get(f"key:owner:{key}")

    embed = discord.Embed(title="📋 密钥完整日志（详细设备信息）", color=0x3498db)
    embed.add_field(name="🔑 密钥", value=f"`{key}`", inline=False)

    if owner:
        try:
            o = json.loads(owner) if isinstance(owner, str) else owner
            embed.add_field(name="👤 领取者", value=o.get("name", "未知"), inline=True)
            embed.add_field(name="🆔 用户ID", value=o.get("uid", "未知"), inline=True)
            embed.add_field(name="📤 发放时间", value=o.get("issuedAt", "未知"), inline=True)
            embed.add_field(name="📝 发放方式", value=o.get("method", "未知"), inline=False)
            
            # 添加Discord绑定字段
            if "discordId" in o:
                embed.add_field(name="🔗 绑定Discord ID", value=o.get("discordId", "未绑定"), inline=True)
        except:
            embed.add_field(name="发放信息", value="解析失败", inline=False)
    else:
        embed.add_field(name="发放信息", value="无记录", inline=False)

    if info:
        try:
            entry = json.loads(info) if isinstance(info, str) else info
            embed.add_field(name="🕐 使用时间", value=entry.get("usedAt", "未知"), inline=True)
            embed.add_field(name="🌐 IP地址", value=entry.get("ip", "未知"), inline=True)
            
            # 增强的设备信息
            ua = entry.get("userAgent", "未知")
            device_info = parse_user_agent(ua)
            
            embed.add_field(name="📱 设备类型", value=device_info.get("device", "未知"), inline=True)
            embed.add_field(name="💻 操作系统", value=device_info.get("os", "未知"), inline=True)
            embed.add_field(name="🌐 浏览器", value=device_info.get("browser", "未知"), inline=True)
            embed.add_field(name="📋 完整User-Agent", value=f"```{ua[:300]}```", inline=False)
            
            # 添加Discord账号验证信息
            if "discordId" in entry:
                embed.add_field(name="🔗 使用时Discord ID", value=entry.get("discordId", "未记录"), inline=True)
                discord_uid = entry.get("discordId", "")
                owner_uid = json.loads(owner).get("uid", "") if owner else ""
                if discord_uid == owner_uid:
                    embed.add_field(name="✅ Discord账号验证", value="✅ 一致（验证成功）", inline=True)
                else:
                    embed.add_field(name="❌ Discord账号验证", value=f"❌ 不一致", inline=True)
        except Exception as e:
            embed.add_field(name="使用信息", value=f"解析失败: {str(e)[:100]}", inline=False)
    else:
        embed.add_field(name="使用信息", value="尚未使用", inline=False)

    in_valid = redis.sismember("keys:valid", key)
    in_issued = redis.sismember("keys:issued", key)
    is_used = redis.get(f"key:used:{key}")
    if is_used == "true":
        embed.set_footer(text="状态：🔴 已使用")
        embed.color = 0xff0000
    elif in_issued:
        embed.set_footer(text="状态：🟡 已发出待验证")
        embed.color = 0xf1c40f
    elif in_valid:
        embed.set_footer(text="状态：🟢 可用")
        embed.color = 0x2ecc71
    else:
        embed.set_footer(text="状态：⚫ 不存在")
        embed.color = 0x95a5a6

    await interaction.followup.send(embed=embed, ephemeral=True)

# ======================
# /发送密钥（管理员）
# ======================
@bot.tree.command(name="发送密钥", description="[管理员] 向指定用户发送一个新密钥")
@app_commands.default_permissions(administrator=True)
@app_commands.describe(member="要发送密钥的用户")
async def 发送密钥(interaction: discord.Interaction, member: discord.Member):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

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
        await interaction.followup.send("❌ 暂无可用密钥，请先添加密钥", ephemeral=True)
        return

    try:
        redis.sadd("keys:issued", key)
        redis.lpush(f"user:keys:{member.id}", key)
        redis.set(f"key:owner:{key}", json.dumps({
            "uid": str(member.id),
            "name": str(member),
            "issuedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
            "method": f"管理员({interaction.user})手动发送",
            "discordId": str(member.id)
        }))

        embed = discord.Embed(title="🎁 管理员为你分配了密钥", color=0x5865F2)
        embed.add_field(name="🔑 你的密钥", value=f"```{key}```", inline=False)
        embed.add_field(name="📋 使用方法", value=(
            "1️⃣ 复制上方密钥\n"
            "2️⃣ 打开网站，在弹出的验证框中粘贴密钥\n"
            "3️⃣ 点击「验证」按钮即可进入"
        ), inline=False)
        embed.add_field(name="⚠️ 注意", value="密钥仅限一次使用，请尽快验证，不要分享给他人", inline=False)

        await member.send(embed=embed)
        await interaction.followup.send(
            f"✅ 已向 {member.mention} 发送密钥 `{key[:4]}***`\n"
            f"📦 剩余可用密钥：**{redis.scard('keys:valid')}** 个",
            ephemeral=True
        )

    except:
        redis.srem("keys:issued", key)
        redis.sadd("keys:valid", key)
        await interaction.followup.send(
            f"❌ 无法向 {member.mention} 发送私信\n"
            "对方可能未开启私信权限，密钥已自动归还。",
            ephemeral=True
        )

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

    for i, k in enumerate(keys, 1):
        k = clean_key(k)
        is_used = redis.get(f"key:used:{k}")
        info = redis.get(f"key:info:{k}")
        owner = redis.get(f"key:owner:{k}")

        lines = [f"🔑 `{k}`"]

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

        embed.add_field(name=f"密钥 #{i}", value="\n".join(lines), inline=False)

    embed.set_footer(text=f"共 {len(keys)} 个密钥 | 查询时间：{time.strftime('%Y-%m-%d %H:%M:%S')}")
    await interaction.followup.send(embed=embed, ephemeral=True)

# ======================
# /补录密钥（管理员）
# ======================
@bot.tree.command(name="补录密钥", description="[管理员] 手动补录密钥到用户记录（用于旧数据）")
@app_commands.default_permissions(administrator=True)
@app_commands.describe(member="用户", key="密钥")
async def 补录密钥(interaction: discord.Interaction, member: discord.Member, key: str):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    key = clean_key(key)
    redis.lpush(f"user:keys:{member.id}", key)
    redis.set(f"key:owner:{key}", json.dumps({
        "uid": str(member.id),
        "name": str(member),
        "issuedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "method": f"管理员({interaction.user})手动补录",
        "discordId": str(member.id)
    }))
    await interaction.followup.send(
        f"✅ 已将密钥 `{key}` 补录到 {member.mention} 的记录中",
        ephemeral=True
    )

# ======================
# /重置密钥（管理员）
# ======================
@bot.tree.command(name="重置密钥", description="[管理员] 重置密钥为可用状态，允许再次使用")
@app_commands.default_permissions(administrator=True)
@app_commands.describe(key="要重置的密钥")
async def 重置密钥(interaction: discord.Interaction, key: str):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    key = clean_key(key)
    redis.delete(f"key:used:{key}")
    redis.srem("keys:issued", key)
    redis.sadd("keys:valid", key)
    redis.delete(f"key:info:{key}")

    await interaction.followup.send(
        f"✅ 密钥 `{key}` 已重置为可用状态\n"
        f"📦 当前可用密钥总数：**{redis.scard('keys:valid')}** 个",
        ephemeral=True
    )

# ======================
# /重置用户（管理员）
# ======================
@bot.tree.command(name="重置用户", description="[管理员] 重置用户的自助领取资格")
@app_commands.default_permissions(administrator=True)
@app_commands.describe(member="要重置的用户")
async def 重置用户(interaction: discord.Interaction, member: discord.Member):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    uid = str(member.id)
    redis.delete(f"user:got_key:{uid}")
    await interaction.followup.send(
        f"✅ 已重置 {member.mention} 的领取资格\n"
        "该用户现在可以重新使用 `/领取密钥` 命令。",
        ephemeral=True
    )

# ======================
# /导出全局日志 CSV（管理员 - 导出所有用户的日志）
# ======================
@bot.tree.command(name="导出全局日志", description="[管理员] 导出所有用户的密钥记录为CSV文件（可用Excel打开）")
@app_commands.default_permissions(administrator=True)
@app_commands.describe(days="只导出N天内的记录（0=导出全部，默认0）")
async def 导出全局日志(interaction: discord.Interaction, days: int = 0):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    try:
        # 收集所有用户的所有密钥记录
        keys_data = []
        processed_count = 0
        issued_keys = redis.smembers("keys:issued")
        
        if not issued_keys:
            await interaction.followup.send("📭 暂无任何密钥记录", ephemeral=True)
            return
        
        # 计算时间阈值
        cutoff_time = None
        if days > 0:
            cutoff_time = datetime.now().timestamp() - (days * 86400)
        
        for k in issued_keys:
            k = clean_key(k)
            processed_count += 1
            
            is_used = redis.get(f"key:used:{k}")
            info = redis.get(f"key:info:{k}")
            owner = redis.get(f"key:owner:{k}")

            key_info = {
                "key": k,
                "owner_name": "",
                "uid": "",
                "issued_at": "",
                "method": "",
                "status": "",
                "used_at": "",
                "ip": "",
                "device": "",
                "os": "",
                "browser": "",
                "user_agent": ""
            }

            if owner:
                try:
                    o = json.loads(owner) if isinstance(owner, str) else owner
                    key_info["owner_name"] = o.get("name", "")
                    key_info["uid"] = o.get("uid", "")
                    key_info["issued_at"] = o.get("issuedAt", "")
                    key_info["method"] = o.get("method", "")
                except:
                    pass

            if is_used == "true" or is_used is True:
                key_info["status"] = "已使用"
                try:
                    entry = json.loads(info) if isinstance(info, str) else (info or {})
                    used_at_str = entry.get("usedAt", "")
                    key_info["used_at"] = used_at_str
                    key_info["ip"] = entry.get("ip", "")
                    ua = entry.get("userAgent", "")
                    key_info["user_agent"] = ua
                    
                    # 如果指定了时间范围，检查是否在范围内
                    if cutoff_time and used_at_str:
                        try:
                            # 尝试解析时间戳
                            import datetime as dt
                            used_timestamp = dt.datetime.strptime(used_at_str[:19], "%Y-%m-%d %H:%M:%S").timestamp()
                            if used_timestamp < cutoff_time:
                                continue  # 跳过超出时间范围的记录
                        except:
                            pass
                    
                    device_info = parse_user_agent(ua)
                    key_info["device"] = device_info.get("device", "")
                    key_info["os"] = device_info.get("os", "")
                    key_info["browser"] = device_info.get("browser", "")
                except:
                    pass
            else:
                in_issued = redis.sismember("keys:issued", k)
                key_info["status"] = "已发出（未使用）" if in_issued else "其他"

            keys_data.append(key_info)

        # 生成CSV
        csv_content = generate_csv_report(keys_data)
        
        # 创建文件
        csv_bytes = csv_content.encode('utf-8-sig')  # 使用UTF-8-BOM以支持Excel中文显示
        
        # 发送文件
        time_suffix = f"({days}天内)" if days > 0 else "(全部)"
        filename = f"全局密钥记录_{time_suffix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        from discord import File
        from io import BytesIO
        
        file_obj = BytesIO(csv_bytes)
        file = discord.File(file_obj, filename=filename)
        
        await interaction.followup.send(
            f"✅ 已生成全局密钥记录CSV文件\n"
            f"📊 统计信息：\n"
            f"• 扫描密钥数：{processed_count}个\n"
            f"• 导出记录数：{len(keys_data)}个\n"
            f"• 时间范围：{time_suffix}\n"
            f"💾 文件可直接用Excel打开",
            file=file,
            ephemeral=True
        )
    except Exception as e:
        await interaction.followup.send(
            f"❌ 生成CSV文件失败: {str(e)}",
            ephemeral=True
        )

# /保留的用户日志导出（管理员）
# ======================
@bot.tree.command(name="导出用户日志", description="[管理员] 导出指定用户的所有密钥记录为CSV（可用Excel打开）")
@app_commands.default_permissions(administrator=True)
@app_commands.describe(member="要导出的用户")
async def 导出用户日志(interaction: discord.Interaction, member: discord.Member):
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

    # 收集数据
    keys_data = []
    for k in keys:
        k = clean_key(k)
        is_used = redis.get(f"key:used:{k}")
        info = redis.get(f"key:info:{k}")
        owner = redis.get(f"key:owner:{k}")

        key_info = {
            "key": k,
            "owner_name": "",
            "uid": "",
            "issued_at": "",
            "method": "",
            "status": "",
            "used_at": "",
            "ip": "",
            "device": "",
            "os": "",
            "browser": "",
            "user_agent": ""
        }

        if owner:
            try:
                o = json.loads(owner) if isinstance(owner, str) else owner
                key_info["owner_name"] = o.get("name", "")
                key_info["uid"] = o.get("uid", "")
                key_info["issued_at"] = o.get("issuedAt", "")
                key_info["method"] = o.get("method", "")
            except:
                pass

        if is_used == "true" or is_used is True:
            key_info["status"] = "已使用"
            try:
                entry = json.loads(info) if isinstance(info, str) else (info or {})
                key_info["used_at"] = entry.get("usedAt", "")
                key_info["ip"] = entry.get("ip", "")
                ua = entry.get("userAgent", "")
                key_info["user_agent"] = ua
                
                device_info = parse_user_agent(ua)
                key_info["device"] = device_info.get("device", "")
                key_info["os"] = device_info.get("os", "")
                key_info["browser"] = device_info.get("browser", "")
            except:
                pass
        else:
            in_issued = redis.sismember("keys:issued", k)
            key_info["status"] = "已发出（未使用）" if in_issued else "其他"

        keys_data.append(key_info)

    # 生成CSV
    csv_content = generate_csv_report(keys_data)
    
    # 创建文件
    csv_bytes = csv_content.encode('utf-8-sig')  # 使用UTF-8-BOM以支持Excel中文显示
    
    # 发送文件
    filename = f"{member.display_name}_密钥记录_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    try:
        from discord import File
        from io import BytesIO
        
        file_obj = BytesIO(csv_bytes)
        file = discord.File(file_obj, filename=filename)
        
        await interaction.followup.send(
            f"✅ 已生成 {member.mention} 的密钥记录CSV文件（{len(keys)}个密钥）\n"
            f"📊 文件包含完整的使用记录，可直接用Excel打开。",
            file=file,
            ephemeral=True
        )
    except Exception as e:
        await interaction.followup.send(
            f"❌ 生成CSV文件失败: {str(e)}\n"
            f"原始数据：\n```\n{csv_content[:500]}\n```",
            ephemeral=True
        )

# ======================
# /清理过期日志（管理员 - 全局清理）
# ======================
@bot.tree.command(name="清理日志", description="[管理员] 清理所有用户N天前的日志数据，释放存储空间")
@app_commands.default_permissions(administrator=True)
@app_commands.describe(days="清理N天前的日志（默认30天）")
async def 清理日志(interaction: discord.Interaction, days: int = 30):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    try:
        cutoff_time = datetime.now().timestamp() - (days * 86400)
        cleaned_count = 0
        
        # 获取所有已发放的密钥
        issued_keys = redis.smembers("keys:issued")
        
        if not issued_keys:
            await interaction.followup.send("📭 暂无任何密钥记录", ephemeral=True)
            return
        
        # 遍历所有密钥，检查是否超过指定时间
        for k in issued_keys:
            k = clean_key(k)
            is_used = redis.get(f"key:used:{k}")
            
            if is_used == "true" or is_used is True:
                info = redis.get(f"key:info:{k}")
                if info:
                    try:
                        entry = json.loads(info) if isinstance(info, str) else (info or {})
                        used_at_str = entry.get("usedAt", "")
                        
                        if used_at_str:
                            # 尝试解析时间戳
                            import datetime as dt
                            try:
                                used_timestamp = dt.datetime.strptime(used_at_str[:19], "%Y-%m-%d %H:%M:%S").timestamp()
                                if used_timestamp < cutoff_time:
                                    # 清理这个密钥的详细信息
                                    redis.delete(f"key:info:{k}")
                                    cleaned_count += 1
                            except:
                                pass
                    except:
                        pass
        
        # 生成报告
        embed = discord.Embed(title="🧹 日志清理完成", color=0x2ecc71)
        embed.add_field(name="📅 清理时间", value=f"{days}天前的日志", inline=False)
        embed.add_field(name="📊 清理统计", value=(
            f"• 扫描密钥总数：{len(issued_keys)}个\n"
            f"• 实际清理记录：{cleaned_count}条\n"
            f"• 保留用户账户信息用于追溯"
        ), inline=False)
        embed.add_field(name="💾 存储优化", value=(
            "• ✅ 已删除超期的日志详情\n"
            "• ✅ 已保留关键信息用于审计\n"
            "• 💡 建议：定期导出日志备份"
        ), inline=False)
        embed.add_field(name="⏰ 清理时间戳", value=f"早于 {datetime.fromtimestamp(cutoff_time).strftime('%Y-%m-%d %H:%M:%S')}", inline=False)
        embed.set_footer(text=f"执行时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        await interaction.followup.send(embed=embed, ephemeral=True)
        print(f"✅ 日志清理完成：清理了{cleaned_count}条记录")
        
    except Exception as e:
        import traceback
        await interaction.followup.send(
            f"❌ 日志清理失败: {str(e)}",
            ephemeral=True
        )
        traceback.print_exc()

# ======================
# /社区审核面板（管理员）
# ======================
@bot.tree.command(name="社区审核面板", description="[管理员] 发送社区审核工单面板，成员可点击申请加入审核")
@app_commands.default_permissions(administrator=True)
async def 社区审核面板(interaction: discord.Interaction):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return

    embed = discord.Embed(
        title="🔍 加入社区审核",
        description=(
            "欢迎申请加入我们的社区审核团队！\n\n"
            "点击下方按钮创建审核工单，按照要求提交所需材料。\n"
            "审核团队会尽快评估你的申请。\n\n"
            "⏱️ 预计审核时间：未知"
        ),
        color=0x9C27B0
    )
    embed.set_footer(text="每人同时只能开一个审核工单")
    await interaction.response.send_message(embed=embed, view=CommunityReviewView())

# ======================
# 社区审核按钮
# ======================
class CommunityReviewView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="📋 申请加入审核", style=discord.ButtonStyle.blurple, custom_id="create_review_ticket")
    async def create_review_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)

        try:
            guild = interaction.guild
            member = interaction.user

            # 检查是否已有审核工单
            existing = discord.utils.get(guild.text_channels, name=f"审核-{member.name}")
            if existing:
                await interaction.followup.send(
                    f"❌ 你已有一个审核工单：{existing.mention}\n"
                    "请在已有工单中完成审核，每人同时只能开一个审核工单。",
                    ephemeral=True
                )
                return

            # 创建权限覆写
            overwrites = {
                guild.default_role: discord.PermissionOverwrite(view_channel=False),
                member: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True, attach_files=True),
                guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True, manage_channels=True),
            }
            for role in guild.roles:
                if role.permissions.administrator:
                    overwrites[role] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True)

            # 获取或创建"审核"分类
            category = discord.utils.get(guild.categories, name="社区审核")
            if not category:
                category = await guild.create_category("社区审核")

            # 创建审核频道
            channel = await guild.create_text_channel(
                name=f"审核-{member.name}",
                category=category,
                overwrites=overwrites
            )

            # 存储工单信息
            await TicketManager.set_ticket_info(channel.id, member.id, ticket_type="review")

            # 发送审核要求
            embed = discord.Embed(
                title="📋 社区审核工单已创建",
                description=(
                    f"欢迎 {member.mention}！\n\n"
                    "请按照以下要求提交审核材料。完成所有步骤后，管理员会为你进行审核。"
                ),
                color=0x9C27B0
            )
            
            embed.add_field(
                name="📌 第一步：提供年龄证明",
                value=(
                    "请从以下方式选择一种提交年龄证明：\n\n"
                    "**选项 1：支付宝信息（推荐）**\n"
                    "路径：我的 → 点击头像 → 我的主页 → 编辑个人资料\n"
                    "⚠️ 请务必打码个人信息（身份证号、住址等）\n\n"
                    "📝 完成后：修改支付宝个签为\n"
                    "**「喵机1号审核专用」**\n\n"                    
                    "**选项 2：身份证证明**\n"
                    "仅需露出性别和出生年月\n"
                    "其他信息请打码\n"
                    "旁边注明你的 QQ 号\n\n"
                ),
                inline=False
            )
            
            embed.add_field(
                name="🎙️ 第二步：发送语音条",
                value=(
                    "请发送一条语音条（需包含以下内容）：\n\n"
                    "`现在是北京时间 xxx年x月x日 xx点xx分`\n"
                    "`本人性别[女/男] QQ号是[你的QQ号]`\n"
                    "`我绝对不会二传二贩任何内容`\n"
                    "`如果有此行为接受被挂`\n"
                    "\n📢 请清晰、准确地朗读"
                ),
                inline=False
            )

            embed.add_field(
                name="📸 第三步：发送图片",
                value=(
                    
                    "所有图片请一并发送到此频道。"
                ),
                inline=False
            )

            embed.add_field(
                name="✅ 提交完成",
                value=(
                    "管理员会尽快完成审核。\n\n"
                
                ),
                inline=False
            )

            embed.add_field(
                name="⏰ 自动关闭",
                value="如果10分钟内没有任何新消息，工单将自动关闭。",
                inline=False
            )

            embed.set_footer(text="管理员可使用下方按钮领取此工单")

            msg = await channel.send(embed=embed, view=TicketControlView(channel.id, member.id))
            
            # 计划10分钟后自动关闭
            asyncio.create_task(TicketManager.schedule_autoclose(channel, delay_minutes=10))
            
            # 提示成员
            await interaction.followup.send(
                f"✅ 审核工单已创建：{channel.mention}\n"
                "请前往该频道按照要求提交审核材料。",
                ephemeral=True
            )

        except Exception as e:
            print(f"❌ 审核工单创建失败: {e}")
            await interaction.followup.send(
                f"❌ 审核工单创建失败：{str(e)[:200]}\n"
                "请联系管理员检查 Bot 权限。",
                ephemeral=True
            )

# ======================
# /工单面板（管理员）
# ======================
@bot.tree.command(name="工单面板", description="[管理员] 发送工单按钮面板，成员可点击创建私密工单")
@app_commands.default_permissions(administrator=True)
async def 工单面板(interaction: discord.Interaction):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return

    embed = discord.Embed(
        title="🎫 客服工单",
        description=(
            "如果你遇到以下问题，可以点击下方按钮创建工单：\n\n"
            "🔑 密钥无法使用\n"
            "❓ 密钥使用过程中遇到问题\n"
            "💬 需要继续领取新的密钥\n\n"
            "工单频道仅你和管理员可见，请放心描述问题。"
        ),
        color=0x5865F2
    )
    embed.set_footer(text="每人同时只能开一个工单")
    await interaction.response.send_message(embed=embed, view=TicketView())

# ======================
# /关闭工单（管理员）
# ======================
@bot.tree.command(name="关闭工单", description="[管理员] 关闭当前工单或审核工单频道")
@app_commands.default_permissions(administrator=True)
async def 关闭工单(interaction: discord.Interaction):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return

    channel_name = interaction.channel.name
    if not (channel_name.startswith("工单-") or channel_name.startswith("审核-")):
        await interaction.response.send_message("❌ 此频道不是工单或审核频道，请在工单/审核频道内使用此命令", ephemeral=True)
        return

    await interaction.response.send_message("⏳ 频道将在 5 秒后关闭...")
    await asyncio.sleep(5)
    reason = f"管理员 {interaction.user} 关闭频道"
    if channel_name.startswith("审核-"):
        reason = f"管理员 {interaction.user} 关闭审核工单"
    await interaction.channel.delete(reason=reason)


# ======================
# 工单内部按钮（领取、关闭等）
# ======================
class TicketControlView(discord.ui.View):
    """工单频道内的管理按钮"""
    def __init__(self, channel_id=None, member_id=None):
        super().__init__(timeout=None)
        self.channel_id = channel_id
        self.member_id = member_id

    @discord.ui.button(label="🔖 领取工单", style=discord.ButtonStyle.blurple, custom_id="claim_ticket")
    async def claim_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):
        """管理员领取工单"""
        await interaction.response.defer(ephemeral=True)
        
        # 检查是否是管理员
        if not interaction.user.guild_permissions.administrator:
            await interaction.followup.send("❌ 只有管理员可以领取工单", ephemeral=True)
            return
        
        channel = interaction.channel
        guild = interaction.guild
        
        # 从消息获取member_id
        channel_id = channel.id
        ticket_info = TicketManager.get_ticket_info(channel_id)
        if not ticket_info:
            await interaction.followup.send("❌ 无法获取工单信息", ephemeral=True)
            return
        
        member_id = ticket_info.get("member_id")
        
        # 检查是否已被其他管理员领取
        if ticket_info.get("claimed_by") and ticket_info["claimed_by"] != str(interaction.user.id):
            claimant = guild.get_member(int(ticket_info["claimed_by"]))
            await interaction.followup.send(
                f"❌ 此工单已被 {claimant.mention if claimant else '另一位管理员'} 领取",
                ephemeral=True
            )
            return
        
        # 领取工单
        TicketManager.claim_ticket(channel_id, interaction.user.id)
        member = guild.get_member(int(member_id)) if member_id else None
        
        # 更新频道权限：只有领取者和提交者可见，其他人都看不到
        overwrites = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False),
            interaction.user: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True),
            guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True, manage_channels=True),
        }
        
        if member:
            overwrites[member] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True, attach_files=True)
        
        # 对所有管理员角色拒绝访问（领取者通过直接权限访问，不需要角色权限）
        for role in guild.roles:
            if role.permissions.administrator and role != guild.default_role:
                overwrites[role] = discord.PermissionOverwrite(view_channel=False)
        
        try:
            await channel.edit(overwrites=overwrites)
        except:
            pass
        
        # 发送领取确认
        embed = discord.Embed(
            title="✅ 工单已被领取",
            description=f"{interaction.user.mention} 已领取此工单，将由其单独处理。\n\n其他管理员现已无法查看此工单。",
            color=0x2ecc71
        )
        
        # 隐藏领取按钮，显示释放按钮
        button.disabled = True
        release_button = discord.utils.get(self.children, custom_id="release_ticket")
        if release_button:
            release_button.disabled = False
        await interaction.message.edit(view=self)
        
        await interaction.followup.send(embed=embed, ephemeral=False)

    @discord.ui.button(label="🔓 释放工单", style=discord.ButtonStyle.grey, custom_id="release_ticket", disabled=True)
    async def release_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):
        """管理员释放工单（取消领取）"""
        await interaction.response.defer(ephemeral=True)
        
        channel = interaction.channel
        guild = interaction.guild
        
        # 检查是否是领取该工单的管理员
        ticket_info = TicketManager.get_ticket_info(channel.id)
        if not ticket_info or ticket_info.get("claimed_by") != str(interaction.user.id):
            await interaction.followup.send("❌ 只有领取此工单的管理员可以释放", ephemeral=True)
            return
        
        member_id = ticket_info.get("member_id")
        member = guild.get_member(int(member_id)) if member_id else None
        
        # 释放工单
        TicketManager.release_ticket(channel.id)
        
        # 恢复频道权限：允许所有管理员查看
        overwrites = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False),
            guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True, manage_channels=True),
        }
        
        if member:
            overwrites[member] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True, attach_files=True)
        
        # 允许所有管理员角色访问
        for role in guild.roles:
            if role.permissions.administrator and role != guild.default_role:
                overwrites[role] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True)
        
        try:
            await channel.edit(overwrites=overwrites)
        except:
            pass
        
        # 发送释放确认
        embed = discord.Embed(
            title="🔓 工单已被释放",
            description=f"{interaction.user.mention} 已释放此工单，其他管理员现已可以查看。",
            color=0xf39c12
        )
        
        # 启用领取按钮，禁用释放按钮
        button.disabled = True
        claim_button = discord.utils.get(self.children, custom_id="claim_ticket")
        if claim_button:
            claim_button.disabled = False
        await interaction.message.edit(view=self)
        
        await interaction.followup.send(embed=embed, ephemeral=False)

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
                    "请在此描述你遇到的问题，管理员会尽快回复。\n"
                    "你可以发送文字、截图等信息帮助我们更快定位问题。"
                ),
                color=0x5865F2
            )
            embed.add_field(
                name="⏰ 自动关闭",
                value="如果10分钟内没有任何新消息，工单将自动关闭。",
                inline=False
            )
            embed.set_footer(text="管理员可使用下方按钮领取此工单")

            msg = await channel.send(embed=embed, view=TicketControlView(channel.id, member.id))
            
            # 计划10分钟后自动关闭
            asyncio.create_task(TicketManager.schedule_autoclose(channel, delay_minutes=10))
            
            await interaction.followup.send(
                f"✅ 工单已创建：{channel.mention}\n"
                "请前往该频道描述你的问题。",
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
# /改身份（管理员）
# ======================
@bot.tree.command(name="改身份", description="[管理员] 为指定成员修改身份组")
@app_commands.default_permissions(administrator=True)
@app_commands.describe(member="要修改的成员", role="要设置的身份组")
async def 改身份(interaction: discord.Interaction, member: discord.Member, role: discord.Role):
    """管理员修改成员身份组"""
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ 无权限", ephemeral=True)
        return
    if not acquire_cmd_lock(interaction.id):
        return
    await interaction.response.defer(ephemeral=True)

    try:
        # 检查权限
        if role.position >= interaction.user.top_role.position:
            await interaction.followup.send(
                "❌ 无法设置该身份组\n"
                "原因：该身份组的权限等级不低于你的权限等级",
                ephemeral=True
            )
            return

        # 检查bot权限
        if role.position >= interaction.guild.me.top_role.position:
            await interaction.followup.send(
                "❌ Bot权限不足\n"
                "原因：该身份组的权限等级不低于Bot的权限等级",
                ephemeral=True
            )
            return

        # 移除成员所有身份组，然后添加新身份组
        old_roles = [r for r in member.roles if r != interaction.guild.default_role]
        await member.remove_roles(*old_roles, reason=f"由 {interaction.user} 执行身份组修改")
        await member.add_roles(role, reason=f"由 {interaction.user} 执行身份组修改")

        embed = discord.Embed(
            title="✅ 身份组修改成功",
            description=f"{member.mention} 的身份组已修改",
            color=0x2ecc71
        )
        embed.add_field(name="成员", value=member.mention, inline=True)
        embed.add_field(name="新身份组", value=role.mention, inline=True)
        embed.add_field(name="执行者", value=interaction.user.mention, inline=True)

        if old_roles:
            old_roles_str = ", ".join([r.mention for r in old_roles[:10]])  # 最多显示10个旧身份组
            if len(old_roles) > 10:
                old_roles_str += f" 等共 {len(old_roles)} 个身份组"
            embed.add_field(name="移除的身份组", value=old_roles_str, inline=False)

        embed.set_footer(text=f"执行时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        await interaction.followup.send(embed=embed, ephemeral=True)
        print(f"✅ {interaction.user} 将 {member} 的身份组改为 {role.name}")

    except discord.Forbidden:
        await interaction.followup.send(
            "❌ 身份组修改失败\n"
            "原因：Bot权限不足，请检查Bot角色是否拥有足够权限",
            ephemeral=True
        )
    except Exception as e:
        await interaction.followup.send(
            f"❌ 身份组修改失败：{str(e)}",
            ephemeral=True
        )
        print(f"❌ 身份组修改出错: {e}")

# ======================
# 启动 & 同步斜杠命令
# ======================
@bot.event
async def on_ready():
    bot.add_view(TicketView())
    bot.add_view(CommunityReviewView())
    bot.add_view(TicketControlView())  # 持久化注册工单按钮视图
    try:
        synced = await bot.tree.sync()
        print(f"✅ 已同步 {len(synced)} 个斜杠命令")
    except Exception as e:
        print(f"❌ 命令同步失败: {e}")
    print(f"✅ 已登录：{bot.user} | PID: {os.getpid()} | 时间: {time.strftime('%H:%M:%S')}")

if __name__ == "__main__":
    keep_alive()
    hb = Thread(target=heartbeat)
    hb.daemon = True
    hb.start()

    bot.run(os.getenv("DISCORD_BOT_TOKEN"))
