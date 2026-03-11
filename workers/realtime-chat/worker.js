const PRESENCE_TTL_MS = 45000;
const USER_RECORD_TTL_SECONDS = 180;
const MAX_ROOM_MESSAGES = 220;
const MAX_MESSAGE_LENGTH = 500;
const MAX_ROOMS_PER_ZONE = 80;
const MESSAGE_RATE_LIMIT_MS = 650;

let lastSweepAt = 0;

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'bad_request';
  }
}

export default {
  async fetch(request, env) {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(env)
        });
      }

      const url = new URL(request.url);
      const path = url.pathname;

      if (path === '/health') {
        return json(env, {
          ok: true,
          zoneId: zoneId(env),
          zoneName: zoneName(env),
          now: Date.now()
        });
      }

      if (path === '/v1/stats' && request.method === 'GET') {
        return handleStats(env);
      }

      if (path === '/v1/presence/ping' && request.method === 'POST') {
        return handlePing(request, env);
      }

      if (path === '/v1/rooms' && request.method === 'GET') {
        return handleListRooms(request, env);
      }

      if (path === '/v1/rooms' && request.method === 'POST') {
        return handleCreateRoom(request, env);
      }

      const matched = path.match(/^\/v1\/rooms\/([a-zA-Z0-9_-]{6,64})(?:\/([a-z]+))?$/);
      if (matched) {
        const roomId = matched[1];
        const action = matched[2] || '';

        if (action === 'join' && request.method === 'POST') {
          return handleJoinRoom(request, env, roomId);
        }

        if (action === 'leave' && request.method === 'POST') {
          return handleLeaveRoom(request, env, roomId);
        }

        if (action === 'sync' && request.method === 'GET') {
          return handleSyncRoom(request, env, roomId);
        }

        if (action === 'messages' && request.method === 'POST') {
          return handleSendMessage(request, env, roomId);
        }
      }

      throw new HttpError(404, '接口不存在', 'not_found');
    } catch (error) {
      if (error instanceof HttpError) {
        return json(env, { ok: false, error: error.message, code: error.code }, error.status);
      }

      console.error('Worker Error:', error);
      return json(env, { ok: false, error: '服务器异常', code: 'server_error' }, 500);
    }
  }
};

async function handleStats(env) {
  await cleanupZonePresence(env);
  await maybeSweepRooms(env);

  const [onlineRaw, roomRaw] = await redisPipeline(env, [
    ['ZCARD', zonePresenceKey(env)],
    ['SCARD', roomsSetKey(env)]
  ]);

  return json(env, {
    ok: true,
    zoneId: zoneId(env),
    zoneName: zoneName(env),
    onlineCount: toInt(onlineRaw, 0),
    roomCount: toInt(roomRaw, 0),
    capacity: zoneCapacity(env),
    now: Date.now()
  });
}

async function handlePing(request, env) {
  const body = await readJson(request);
  const user = normalizeUser(body && body.user);
  if (!user.id || !user.name) {
    throw new HttpError(400, '用户信息不完整', 'invalid_user');
  }

  let roomId = normalizeRoomId(body && body.roomId);

  await cleanupZonePresence(env);
  await ensureCapacity(env, user.id);

  if (roomId) {
    await cleanupRoomPresence(env, roomId);
    const roomMeta = await getRoomMeta(env, roomId);
    if (!roomMeta) {
      roomId = '';
    }
  }

  await touchUser(env, user, roomId);

  const [onlineRaw, roomRaw] = await redisPipeline(env, [
    ['ZCARD', zonePresenceKey(env)],
    ['SCARD', roomsSetKey(env)]
  ]);

  return json(env, {
    ok: true,
    onlineCount: toInt(onlineRaw, 0),
    roomCount: toInt(roomRaw, 0),
    capacity: zoneCapacity(env)
  });
}

async function handleListRooms(request, env) {
  await cleanupZonePresence(env);
  await maybeSweepRooms(env);

  const url = new URL(request.url);
  const userId = normalizeUserId(url.searchParams.get('userId') || '');
  let currentRoomId = '';
  if (userId) {
    const userRecord = await getUserRecord(env, userId);
    currentRoomId = userRecord && userRecord.roomId ? String(userRecord.roomId) : '';
  }

  const roomIds = await redis(env, ['SMEMBERS', roomsSetKey(env)]);
  const ids = Array.isArray(roomIds) ? roomIds : [];
  if (!ids.length) {
    const onlineRaw = await redis(env, ['ZCARD', zonePresenceKey(env)]);
    return json(env, {
      ok: true,
      rooms: [],
      onlineCount: toInt(onlineRaw, 0),
      roomCount: 0,
      capacity: zoneCapacity(env)
    });
  }

  const commands = [];
  ids.forEach((roomId) => {
    commands.push(['GET', roomMetaKey(env, roomId)]);
    commands.push(['ZCARD', roomPresenceKey(env, roomId)]);
    commands.push(['LRANGE', roomMessagesKey(env, roomId), -1, -1]);
  });

  const raw = await redisPipeline(env, commands);
  const rooms = [];
  let idx = 0;
  ids.forEach((roomId) => {
    const rawMeta = raw[idx++];
    const rawCount = raw[idx++];
    const rawLast = raw[idx++];

    if (!rawMeta) return;
    const meta = parseJson(rawMeta);
    if (!meta || !meta.id) return;

    const memberCount = toInt(rawCount, 0);
    const lastMessage = Array.isArray(rawLast) && rawLast.length ? parseJson(rawLast[0]) : null;
    rooms.push(publicRoom(meta, memberCount, lastMessage, currentRoomId));
  });

  rooms.sort((a, b) => toInt(b.lastActive, 0) - toInt(a.lastActive, 0));

  const [onlineRaw, roomRaw] = await redisPipeline(env, [
    ['ZCARD', zonePresenceKey(env)],
    ['SCARD', roomsSetKey(env)]
  ]);

  return json(env, {
    ok: true,
    rooms,
    onlineCount: toInt(onlineRaw, 0),
    roomCount: toInt(roomRaw, rooms.length),
    capacity: zoneCapacity(env)
  });
}

async function handleCreateRoom(request, env) {
  const body = await readJson(request);
  const user = normalizeUser(body && body.user);
  if (!user.id || !user.name) {
    throw new HttpError(400, '用户信息不完整', 'invalid_user');
  }

  const name = normalizeRoomName(body && body.name);
  const avatar = normalizeImageUrl(body && body.avatar);
  const isPrivate = !!(body && body.isPrivate);
  const key = String((body && body.key) || '').trim();

  if (!name) {
    throw new HttpError(400, '房间名不能为空', 'invalid_room_name');
  }
  if (isPrivate && key.length < 4) {
    throw new HttpError(400, '密钥至少 4 位', 'invalid_room_key');
  }

  await cleanupZonePresence(env);
  await maybeSweepRooms(env);
  await ensureCapacity(env, user.id);

  const roomCountRaw = await redis(env, ['SCARD', roomsSetKey(env)]);
  if (toInt(roomCountRaw, 0) >= MAX_ROOMS_PER_ZONE) {
    throw new HttpError(429, '房间数量已达上限，请稍后再试', 'rooms_limit');
  }

  await detachUserFromOldRoom(env, user.id);

  const now = Date.now();
  const roomId = createRoomId();
  const meta = {
    id: roomId,
    name,
    avatar,
    isPrivate,
    keyHash: isPrivate ? await sha256(key) : '',
    ownerId: user.id,
    createdAt: now,
    lastActive: now,
    lastMessagePreview: ''
  };

  await redisPipeline(env, [
    ['SADD', roomsSetKey(env), roomId],
    ['SET', roomMetaKey(env, roomId), JSON.stringify(meta)],
    ['ZADD', roomPresenceKey(env, roomId), now, user.id]
  ]);

  await touchUser(env, user, roomId);

  return json(env, {
    ok: true,
    room: publicRoom(meta, 1, null, roomId),
    members: [publicMember(user)],
    messages: []
  });
}

async function handleJoinRoom(request, env, roomId) {
  const body = await readJson(request);
  const user = normalizeUser(body && body.user);
  const providedKey = String((body && body.key) || '').trim();
  if (!user.id || !user.name) {
    throw new HttpError(400, '用户信息不完整', 'invalid_user');
  }

  await cleanupZonePresence(env);
  await cleanupRoomPresence(env, roomId);
  await ensureCapacity(env, user.id);

  const meta = await getRoomMeta(env, roomId);
  if (!meta) {
    throw new HttpError(404, '房间不存在或已关闭', 'room_not_found');
  }

  if (meta.isPrivate) {
    const keyHash = await sha256(providedKey);
    if (!providedKey || keyHash !== meta.keyHash) {
      throw new HttpError(403, '房间密钥错误', 'invalid_room_key');
    }
  }

  await detachUserFromOldRoom(env, user.id);

  const now = Date.now();
  await redis(env, ['ZADD', roomPresenceKey(env, roomId), now, user.id]);
  await touchUser(env, user, roomId);

  const members = await listRoomMembers(env, roomId);
  const messages = await listRecentMessages(env, roomId);
  return json(env, {
    ok: true,
    room: publicRoom(meta, members.length, messages.length ? messages[messages.length - 1] : null, roomId),
    members,
    messages
  });
}

async function handleLeaveRoom(request, env, roomId) {
  const body = await readJson(request);
  const userId = normalizeUserId(body && body.userId);
  if (!userId) {
    throw new HttpError(400, '缺少 userId', 'invalid_user');
  }

  await redis(env, ['ZREM', roomPresenceKey(env, roomId), userId]);
  await cleanupRoomPresence(env, roomId);

  const user = await getUserRecord(env, userId);
  if (user && user.id) {
    await touchUser(env, user, '');
  }

  return json(env, { ok: true });
}

async function handleSyncRoom(request, env, roomId) {
  const url = new URL(request.url);
  const since = toInt(url.searchParams.get('since'), 0);
  const userId = normalizeUserId(url.searchParams.get('userId') || '');
  if (!userId) {
    throw new HttpError(400, '缺少 userId', 'invalid_user');
  }

  await cleanupRoomPresence(env, roomId);

  const meta = await getRoomMeta(env, roomId);
  if (!meta) {
    return json(env, {
      ok: true,
      roomDeleted: true,
      messages: [],
      members: []
    });
  }

  const inRoom = await redis(env, ['ZSCORE', roomPresenceKey(env, roomId), userId]);
  if (inRoom === null || typeof inRoom === 'undefined') {
    throw new HttpError(403, '你不在这个房间中', 'not_in_room');
  }

  const allMessages = await listRecentMessages(env, roomId);
  const newMessages = since > 0
    ? allMessages.filter((msg) => toInt(msg.createdAt, 0) > since)
    : allMessages;

  const members = await listRoomMembers(env, roomId);
  const user = await getUserRecord(env, userId);
  if (user && user.id) {
    await touchUser(env, user, roomId);
  }

  return json(env, {
    ok: true,
    roomDeleted: false,
    room: publicRoom(meta, members.length, allMessages.length ? allMessages[allMessages.length - 1] : null, roomId),
    members,
    messages: newMessages
  });
}

async function handleSendMessage(request, env, roomId) {
  const body = await readJson(request);
  const user = normalizeUser(body && body.user);
  const text = normalizeMessageText(body && body.text);
  const emojiUrl = normalizeImageUrl(body && body.emojiUrl);
  if (!user.id || !user.name) {
    throw new HttpError(400, '用户信息不完整', 'invalid_user');
  }
  if (!text && !emojiUrl) {
    throw new HttpError(400, '消息不能为空', 'empty_message');
  }

  const inRoom = await redis(env, ['ZSCORE', roomPresenceKey(env, roomId), user.id]);
  if (inRoom === null || typeof inRoom === 'undefined') {
    throw new HttpError(403, '你不在这个房间中', 'not_in_room');
  }

  const meta = await getRoomMeta(env, roomId);
  if (!meta) {
    throw new HttpError(404, '房间不存在或已关闭', 'room_not_found');
  }

  const rateLimitOk = await redis(env, [
    'SET',
    messageRateKey(env, user.id),
    '1',
    'PX',
    MESSAGE_RATE_LIMIT_MS,
    'NX'
  ]);
  if (!rateLimitOk) {
    throw new HttpError(429, '发送过于频繁，请稍后再试', 'message_rate_limited');
  }

  const now = Date.now();
  const message = {
    id: createMessageId(),
    roomId,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    text,
    emojiUrl,
    createdAt: now
  };

  await redisPipeline(env, [
    ['RPUSH', roomMessagesKey(env, roomId), JSON.stringify(message)],
    ['LTRIM', roomMessagesKey(env, roomId), -MAX_ROOM_MESSAGES, -1]
  ]);

  meta.lastActive = now;
  meta.lastMessagePreview = text ? text.slice(0, 32) : '[表情]';
  await redis(env, ['SET', roomMetaKey(env, roomId), JSON.stringify(meta)]);

  await touchUser(env, user, roomId);

  return json(env, {
    ok: true,
    message
  });
}

async function cleanupZonePresence(env) {
  const threshold = Date.now() - PRESENCE_TTL_MS;
  await redis(env, ['ZREMRANGEBYSCORE', zonePresenceKey(env), '-inf', threshold]);
}

async function cleanupRoomPresence(env, roomId) {
  if (!roomId) return;
  const threshold = Date.now() - PRESENCE_TTL_MS;
  await redis(env, ['ZREMRANGEBYSCORE', roomPresenceKey(env, roomId), '-inf', threshold]);
  const countRaw = await redis(env, ['ZCARD', roomPresenceKey(env, roomId)]);
  const count = toInt(countRaw, 0);
  if (count > 0) return;

  await redisPipeline(env, [
    ['SREM', roomsSetKey(env), roomId],
    ['DEL', roomMetaKey(env, roomId)],
    ['DEL', roomPresenceKey(env, roomId)],
    ['DEL', roomMessagesKey(env, roomId)]
  ]);
}

async function maybeSweepRooms(env) {
  const now = Date.now();
  if (now - lastSweepAt < 10000) {
    return;
  }
  lastSweepAt = now;

  const roomIds = await redis(env, ['SMEMBERS', roomsSetKey(env)]);
  const ids = Array.isArray(roomIds) ? roomIds : [];
  for (const roomId of ids) {
    await cleanupRoomPresence(env, roomId);
  }
}

async function ensureCapacity(env, userId) {
  const [existsRaw, onlineRaw] = await redisPipeline(env, [
    ['ZSCORE', zonePresenceKey(env), userId],
    ['ZCARD', zonePresenceKey(env)]
  ]);
  const alreadyOnline = !(existsRaw === null || typeof existsRaw === 'undefined');
  if (alreadyOnline) return;

  const onlineCount = toInt(onlineRaw, 0);
  if (onlineCount >= zoneCapacity(env)) {
    throw new HttpError(429, '当前线路已满，请切换另一路线', 'zone_full');
  }
}

async function touchUser(env, user, roomId) {
  const now = Date.now();
  const userRecord = {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    roomId: roomId || '',
    seenAt: now
  };

  const commands = [
    ['ZADD', zonePresenceKey(env), now, user.id],
    ['SET', userKey(env, user.id), JSON.stringify(userRecord), 'EX', USER_RECORD_TTL_SECONDS]
  ];

  if (roomId) {
    commands.push(['ZADD', roomPresenceKey(env, roomId), now, user.id]);
  }

  await redisPipeline(env, commands);
}

async function detachUserFromOldRoom(env, userId) {
  if (!userId) return;
  const raw = await redis(env, ['GET', userKey(env, userId)]);
  if (!raw) return;
  const user = parseJson(raw);
  if (!user || !user.roomId) return;

  await redis(env, ['ZREM', roomPresenceKey(env, user.roomId), userId]);
  await cleanupRoomPresence(env, user.roomId);
}

async function listRoomMembers(env, roomId) {
  const userIds = await redis(env, ['ZRANGE', roomPresenceKey(env, roomId), 0, -1]);
  const ids = Array.isArray(userIds) ? userIds : [];
  if (!ids.length) return [];

  const commands = ids.map((id) => ['GET', userKey(env, id)]);
  const rawUsers = await redisPipeline(env, commands);
  const members = [];

  rawUsers.forEach((raw, index) => {
    const user = parseJson(raw);
    if (user && user.id) {
      members.push(publicMember(user));
    } else {
      members.push({
        id: ids[index],
        name: '用户' + ids[index].slice(-4),
        avatar: ''
      });
    }
  });

  return members;
}

async function listRecentMessages(env, roomId) {
  const raw = await redis(env, ['LRANGE', roomMessagesKey(env, roomId), -120, -1]);
  if (!Array.isArray(raw) || !raw.length) return [];
  return raw.map(parseJson).filter(Boolean).map((msg) => ({
    id: String(msg.id || ''),
    roomId: String(msg.roomId || roomId),
    userId: String(msg.userId || ''),
    userName: normalizeName(msg.userName || '匿名用户'),
    userAvatar: normalizeImageUrl(msg.userAvatar || ''),
    text: normalizeMessageText(msg.text || ''),
    emojiUrl: normalizeImageUrl(msg.emojiUrl || ''),
    createdAt: toInt(msg.createdAt, Date.now())
  }));
}

async function getRoomMeta(env, roomId) {
  const raw = await redis(env, ['GET', roomMetaKey(env, roomId)]);
  const meta = parseJson(raw);
  return meta && meta.id ? meta : null;
}

async function getUserRecord(env, userId) {
  if (!userId) return null;
  const raw = await redis(env, ['GET', userKey(env, userId)]);
  const user = parseJson(raw);
  return user && user.id ? user : null;
}

function publicRoom(meta, memberCount, lastMessage, currentRoomId) {
  const joined = !!(currentRoomId && meta && currentRoomId === (meta.id || ''));
  return {
    id: String(meta.id || ''),
    name: String(meta.name || '未命名房间'),
    avatar: normalizeImageUrl(meta.avatar || ''),
    isPrivate: !!meta.isPrivate,
    memberCount: toInt(memberCount, 0),
    ownerId: String(meta.ownerId || ''),
    createdAt: toInt(meta.createdAt, 0),
    lastActive: toInt(meta.lastActive, 0),
    lastMessagePreview: lastMessage
      ? (lastMessage.text ? String(lastMessage.text).slice(0, 32) : '[表情]')
      : String(meta.lastMessagePreview || ''),
    joined: joined
  };
}

function publicMember(user) {
  return {
    id: String(user.id || ''),
    name: normalizeName(user.name || '匿名用户'),
    avatar: normalizeImageUrl(user.avatar || '')
  };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    throw new HttpError(400, '请求体必须为 JSON', 'invalid_json');
  }
}

async function sha256(text) {
  const data = new TextEncoder().encode(String(text || ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function createRoomId() {
  return 'room_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

function createMessageId() {
  return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function normalizeRoomId(value) {
  const id = String(value || '').trim();
  if (!id) return '';
  if (!/^[a-zA-Z0-9_-]{6,64}$/.test(id)) return '';
  return id;
}

function normalizeUserId(value) {
  return String(value || '').trim().slice(0, 80);
}

function normalizeUser(user) {
  user = user || {};
  return {
    id: normalizeUserId(user.id || ''),
    name: normalizeName(user.name || ''),
    avatar: normalizeImageUrl(user.avatar || '')
  };
}

function normalizeRoomName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 30);
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 24);
}

function normalizeMessageText(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, MAX_MESSAGE_LENGTH);
}

function normalizeImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url.slice(0, 1500);
  if (/^data:image\//i.test(url)) return url.slice(0, 8000);
  return '';
}

function parseJson(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return Number.isFinite(fallback) ? fallback : 0;
  }
  return Math.floor(n);
}

function zoneId(env) {
  return String(env.ZONE_ID || 'zone-1');
}

function zoneName(env) {
  return String(env.ZONE_NAME || '喵机线路');
}

function zoneCapacity(env) {
  return toInt(env.MAX_ONLINE || 100, 100);
}

function zonePrefix(env) {
  return 'rtc:' + zoneId(env);
}

function zonePresenceKey(env) {
  return zonePrefix(env) + ':presence';
}

function roomsSetKey(env) {
  return zonePrefix(env) + ':rooms';
}

function roomMetaKey(env, roomId) {
  return zonePrefix(env) + ':room:' + roomId + ':meta';
}

function roomPresenceKey(env, roomId) {
  return zonePrefix(env) + ':room:' + roomId + ':presence';
}

function roomMessagesKey(env, roomId) {
  return zonePrefix(env) + ':room:' + roomId + ':messages';
}

function userKey(env, userId) {
  return zonePrefix(env) + ':user:' + userId;
}

function messageRateKey(env, userId) {
  return zonePrefix(env) + ':rate:message:' + userId;
}

function corsHeaders(env) {
  const allowOrigin = env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

function json(env, payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: Object.assign(
      {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      },
      corsHeaders(env)
    )
  });
}

async function redis(env, command) {
  const endpoint = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!endpoint || !token) {
    throw new HttpError(500, 'Redis 环境变量未配置', 'redis_not_configured');
  }

  const url = endpoint.replace(/\/+$/, '') + '/' + command.map((p) => encodeURIComponent(String(p))).join('/');
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token
    }
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new HttpError(500, payload.error || 'Redis 请求失败', 'redis_error');
  }
  return payload.result;
}

async function redisPipeline(env, commands) {
  if (!Array.isArray(commands) || !commands.length) {
    return [];
  }

  const endpoint = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!endpoint || !token) {
    throw new HttpError(500, 'Redis 环境变量未配置', 'redis_not_configured');
  }

  const url = endpoint.replace(/\/+$/, '') + '/pipeline';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  });
  const payload = await response.json();
  if (!response.ok || !Array.isArray(payload)) {
    throw new HttpError(500, 'Redis pipeline 请求失败', 'redis_error');
  }

  return payload.map((item) => {
    if (item && item.error) {
      throw new HttpError(500, item.error, 'redis_error');
    }
    return item ? item.result : null;
  });
}
