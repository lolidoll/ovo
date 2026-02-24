/**
 * 改进的本地CORS代理服务器
 * 支持多种后端框架和更好的错误处理
 * 启动方式: node cors-proxy-improved.js
 */

const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');

const PROXY_PORT = process.env.PROXY_PORT || 8888;
const PROXY_HOST = '127.0.0.1';

// 日志颜色
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(level, message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    let color = colors.reset;
    switch(level) {
        case 'success': color = colors.green; break;
        case 'error': color = colors.red; break;
        case 'warn': color = colors.yellow; break;
        case 'info': color = colors.blue; break;
        case 'debug': color = colors.cyan; break;
    }
    console.log(`${color}[${timestamp}] ${level.toUpperCase()}:${colors.reset} ${message}`);
}

const server = http.createServer(async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    
    // 设置CORS头 - 更完整的配置
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Custom-Header');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, X-RateLimit-Limit, X-RateLimit-Remaining');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        log('debug', `预检请求 (${requestId})`);
        return;
    }
    
    // 支持两种API调用方式
    const isPathProxy = req.url.startsWith('/proxy');
    const isJsonBodyProxy = req.method === 'POST' && (req.url === '/' || req.url === '/api');
    
    if (!isPathProxy && !isJsonBodyProxy) {
        res.writeHead(404);
        res.end(JSON.stringify({ 
            error: '不支持的请求路径',
            supportedEndpoints: ['/proxy?url=...', '(POST) / 或 /api']
        }));
        log('warn', `不支持的路径: ${req.url} (${requestId})`);
        return;
    }
    
    try {
        let targetUrl;
        let method;
        let headers;
        let requestBody;
        
        if (isPathProxy) {
            // 方式1: /proxy?url=xxxx&method=POST
            const params = new url.URL(`http://${req.headers.host}${req.url}`).searchParams;
            targetUrl = params.get('url');
            method = params.get('method') || 'GET';
            
            if (!targetUrl) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'url参数缺失' }));
                log('warn', `url参数缺失 (${requestId})`);
                return;
            }
            
            // 从查询字符串提取headers
            headers = {};
            for (let [key, value] of params) {
                if (key.startsWith('header_')) {
                    const headerName = key.substring(7);
                    headers[headerName] = value;
                }
            }
            
            // 从请求体读取POST数据
            if (method === 'POST' || method === 'PUT') {
                await readRequestBody(req, (body) => {
                    try {
                        requestBody = JSON.parse(body);
                    } catch (e) {
                        requestBody = body;
                    }
                });
            }
        } else {
            // 方式2: JSON请求体
            await readRequestBody(req, (body) => {
                try {
                    const proxyRequest = JSON.parse(body);
                    targetUrl = proxyRequest.url;
                    method = proxyRequest.method || 'POST';
                    headers = proxyRequest.headers || {};
                    requestBody = proxyRequest.body;
                } catch (e) {
                    log('error', `请求体解析失败: ${e.message}`);
                    throw e;
                }
            });
        }
        
        log('info', `${method} ${targetUrl.substring(0, 80)} (${requestId})`);
        
        // 发送代理请求
        await proxyRequest(targetUrl, method, headers, requestBody, res, requestId);
        
    } catch (error) {
        log('error', `处理失败: ${error.message} (${requestId})`);
        res.writeHead(500);
        res.end(JSON.stringify({ 
            error: '服务器错误',
            message: error.message,
            requestId: requestId
        }));
    }
});

// 辅助函数：读取请求体
function readRequestBody(req, callback) {
    return new Promise((resolve, reject) => {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 10 * 1024 * 1024) { // 10MB 限制
                req.destroy();
                reject(new Error('请求体过大'));
            }
        });
        
        req.on('end', () => {
            try {
                callback(body);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
        
        req.on('error', reject);
        
        // 设置超时
        setTimeout(() => {
            req.destroy();
            reject(new Error('读取请求体超时'));
        }, 30000);
    });
}

// 发送代理请求
async function proxyRequest(targetUrl, method, headers, requestBody, res, requestId) {
    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(targetUrl);
            const isHttps = parsedUrl.protocol === 'https:';
            const client = isHttps ? https : http;
            
            // 构建请求选项
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: method,
                headers: {
                    ...headers,
                    'User-Agent': 'Mozilla/5.0 (CORS-Proxy)',
                    'Accept-Encoding': 'gzip, deflate'
                },
                timeout: 60000
            };
            
            // 移除可能导致问题的headers
            delete options.headers['host'];
            delete options.headers['connection'];
            
            // 如果有请求体，设置Content-Length
            let bodyData = '';
            if (requestBody) {
                if (typeof requestBody === 'string') {
                    bodyData = requestBody;
                } else {
                    bodyData = JSON.stringify(requestBody);
                }
                options.headers['Content-Length'] = Buffer.byteLength(bodyData);
            }
            
            const startTime = Date.now();
            
            const proxyReq = client.request(options, (proxyRes) => {
                let responseData = '';
                const chunks = [];
                
                proxyRes.on('data', chunk => {
                    chunks.push(chunk);
                    responseData += chunk.toString();
                });
                
                proxyRes.on('end', () => {
                    const duration = Date.now() - startTime;
                    const statusCode = proxyRes.statusCode;
                    
                    res.writeHead(statusCode, {
                        'Content-Type': proxyRes.headers['content-type'] || 'application/json; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                        'X-Proxy-Duration': duration,
                        'X-Proxy-Request-Id': requestId
                    });
                    
                    res.end(responseData);
                    
                    if (statusCode >= 200 && statusCode < 300) {
                        log('success', `${statusCode} (${duration}ms) ${requestId}`);
                    } else {
                        log('warn', `${statusCode} (${duration}ms) ${requestId}`);
                    }
                    
                    resolve();
                });
            });
            
            proxyReq.on('error', (error) => {
                log('error', `代理请求错误: ${error.code} ${error.message} (${requestId})`);
                res.writeHead(502);
                res.end(JSON.stringify({ 
                    error: '网关错误',
                    code: error.code,
                    message: error.message,
                    requestId: requestId
                }));
                reject(error);
            });
            
            proxyReq.on('timeout', () => {
                log('warn', `请求超时 (${requestId})`);
                proxyReq.destroy();
                res.writeHead(504);
                res.end(JSON.stringify({ 
                    error: '网关超时',
                    requestId: requestId
                }));
                reject(new Error('超时'));
            });
            
            // 发送请求体
            if (bodyData) {
                proxyReq.write(bodyData);
            }
            
            proxyReq.end();
            
        } catch (error) {
            log('error', `创建请求失败: ${error.message} (${requestId})`);
            res.writeHead(502);
            res.end(JSON.stringify({ 
                error: '网关错误',
                message: error.message,
                requestId: requestId
            }));
            reject(error);
        }
    });
}

server.listen(PROXY_PORT, PROXY_HOST, () => {
    log('success', `CORS代理服务器启动成功`);
    log('info', `🌐 监听地址: http://${PROXY_HOST}:${PROXY_PORT}`);
    log('info', `📝 API端点 1: http://${PROXY_HOST}:${PROXY_PORT}/proxy?url=<your-url>`);
    log('info', `📝 API端点 2: http://${PROXY_HOST}:${PROXY_PORT}/ (POST JSON)`);
    log('info', `💡 在前端使用此代理地址替换API调用`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        log('error', `端口 ${PROXY_PORT} 已被占用，请尝试:`);
        console.log(`  netstat -ano | findstr :${PROXY_PORT}`);
        console.log(`  taskkill /PID <PID> /F`);
        process.exit(1);
    } else {
        log('error', `服务器错误: ${error.message}`);
        process.exit(1);
    }
});

process.on('SIGINT', () => {
    log('info', '收到中断信号，正在关闭...');
    server.close(() => {
        log('success', '服务器已关闭');
        process.exit(0);
    });
});
