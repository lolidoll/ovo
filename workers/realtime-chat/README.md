# 真人联机聊天室后端（Cloudflare Workers + Upstash Redis）

## 架构说明
- 单个 `worker.js` 可部署为多条线路（通过 `ZONE_ID/ZONE_NAME/MAX_ONLINE` 区分）
- 当前提供两套线路模板：
1. `wrangler.zone1.toml`：喵机一区（100 人上限）
2. `wrangler.zone2.toml`：喵机二区（100 人上限）
- 前端会同时读取两条线路在线人数，支持手动切换和智能分流
- 空房间会自动删除（依赖在线心跳 TTL）

## 准备
1. 创建两个 Upstash Redis 数据库（建议一区一个、二区一个）
2. 安装并登录 Wrangler：
```bash
npm i -g wrangler
wrangler login
```

## 部署一区
```bash
cd workers/realtime-chat
wrangler deploy --config wrangler.zone1.toml
wrangler secret put UPSTASH_REDIS_REST_URL --config wrangler.zone1.toml
wrangler secret put UPSTASH_REDIS_REST_TOKEN --config wrangler.zone1.toml
```

## 部署二区
```bash
cd workers/realtime-chat
wrangler deploy --config wrangler.zone2.toml
wrangler secret put UPSTASH_REDIS_REST_URL --config wrangler.zone2.toml
wrangler secret put UPSTASH_REDIS_REST_TOKEN --config wrangler.zone2.toml
```

## 前端接入
部署成功后，把两个 Worker URL 填到 `index.html` 里的 `window.REALTIME_CHAT_CONFIG`：
```js
window.REALTIME_CHAT_CONFIG = {
  zones: [
    { id: 'zone-1', name: '喵机一区', baseUrl: 'https://xxx-zone1.workers.dev', capacity: 100 },
    { id: 'zone-2', name: '喵机二区', baseUrl: 'https://xxx-zone2.workers.dev', capacity: 100 }
  ]
};
```

## API 概览
- `GET /v1/stats`：线路在线人数、房间数
- `POST /v1/presence/ping`：在线心跳
- `GET /v1/rooms`：房间大厅
- `POST /v1/rooms`：创建房间
- `POST /v1/rooms/:id/join`：加入房间（支持密钥）
- `POST /v1/rooms/:id/leave`：离开房间
- `GET /v1/rooms/:id/sync?since=...&userId=...`：同步成员与新消息
- `POST /v1/rooms/:id/messages`：发送消息

## 免费稳定建议
- 前端当前轮询周期：线路 12s / 房间 7s / 房间消息 2.5s / 心跳 18s
- 如果 Upstash 免费额度紧张，可把轮询周期再调大（`realtime-chat.js` 里的 `DEFAULT_POLL`）
- 建议将 `ALLOWED_ORIGIN` 限制为你的站点域名，不要长期使用 `*`
