/**
 * 简单的CORS代理服务器
 * 用于解决前端跨域问题
 * 启动方式: node cors-proxy.js
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PROXY_PORT = 8888;

const server = http.createServer(async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // 只处理POST请求到/proxy端点
    if (req.method !== 'POST' || req.url !== '/proxy') {
        res.writeHead(404);
        res.end(JSON.stringify({ error: '不支持的请求' }));
        return;
    }
    
    try {
        // 收集请求体
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const proxyRequest = JSON.parse(body);
                const targetUrl = proxyRequest.url;
                const method = proxyRequest.method || 'GET';
                const headers = proxyRequest.headers || {};
                const requestBody = proxyRequest.body;
                
                console.log(`[代理] ${method} ${targetUrl}`);
                
                // 解析目标URL
                const parsedUrl = new url.URL(targetUrl);
                const isHttps = parsedUrl.protocol === 'https:';
                const client = isHttps ? https : http;
                
                // 构建请求选项
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port,
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: method,
                    headers: {
                        ...headers,
                        'User-Agent': 'CORS-Proxy/1.0'
                    },
                    timeout: 30000
                };
                
                // 发送请求
                const proxyReq = client.request(options, (proxyRes) => {
                    let responseBody = '';
                    
                    proxyRes.on('data', chunk => {
                        responseBody += chunk.toString();
                    });
                    
                    proxyRes.on('end', () => {
                        res.writeHead(proxyRes.statusCode, {
                            'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        });
                        
                        try {
                            // 尝试解析JSON
                            const jsonData = JSON.parse(responseBody);
                            res.end(JSON.stringify(jsonData));
                        } catch (e) {
                            // 如果不是JSON，直接返回
                            res.end(responseBody);
                        }
                    });
                });
                
                proxyReq.on('error', (error) => {
                    console.error('[代理错误]', error);
                    res.writeHead(502);
                    res.end(JSON.stringify({ 
                        error: '网关错误',
                        message: error.message 
                    }));
                });
                
                proxyReq.on('timeout', () => {
                    proxyReq.destroy();
                    res.writeHead(504);
                    res.end(JSON.stringify({ error: '网关超时' }));
                });
                
                // 发送请求体
                if (requestBody) {
                    proxyReq.write(typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody));
                }
                
                proxyReq.end();
            } catch (error) {
                console.error('[处理错误]', error);
                res.writeHead(400);
                res.end(JSON.stringify({ 
                    error: '请求格式错误',
                    message: error.message 
                }));
            }
        });
    } catch (error) {
        console.error('[服务器错误]', error);
        res.writeHead(500);
        res.end(JSON.stringify({ 
            error: '服务器错误',
            message: error.message 
        }));
    }
});

server.listen(PROXY_PORT, '127.0.0.1', () => {
    console.log(`✅ CORS代理服务器运行在 http://127.0.0.1:${PROXY_PORT}`);
    console.log('📝 代理端点: http://127.0.0.1:8888/proxy');
    console.log('💡 请在运行此脚本后刷新网页');
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ 端口 ${PROXY_PORT} 已被占用`);
    } else {
        console.error('❌ 服务器错误:', error);
    }
    process.exit(1);
});
