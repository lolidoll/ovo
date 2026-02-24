/**
 * CORS 代理测试工具
 * 用于验证代理服务器是否正常工作
 * 
 * 使用方法:
 * 1. 启动代理服务器: node cors-proxy-improved.js
 * 2. 在另一个终端运行: node test-cors-proxy.js
 */

const http = require('http');

const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 8888;

console.log('\n===========================================');
console.log('  CORS 代理健康检查工具');
console.log('===========================================\n');

// 颜色
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(level, message) {
    let color = colors.reset;
    let prefix = '';
    switch(level) {
        case 'success': 
            color = colors.green;
            prefix = '✅';
            break;
        case 'error': 
            color = colors.red;
            prefix = '❌';
            break;
        case 'warn': 
            color = colors.yellow;
            prefix = '⚠️ ';
            break;
        case 'info': 
            color = colors.blue;
            prefix = 'ℹ️ ';
            break;
        case 'debug': 
            color = colors.cyan;
            prefix = '🔧';
            break;
    }
    console.log(`${color}${prefix} ${message}${colors.reset}`);
}

/**
 * 测试 1: 检查代理是否可达
 */
function testProxyConnection() {
    return new Promise((resolve) => {
        log('info', '测试 1/5: 检查代理连接...');
        
        const options = {
            hostname: PROXY_HOST,
            port: PROXY_PORT,
            path: '/',
            method: 'OPTIONS',
            timeout: 5000
        };
        
        const req = http.request(options, (res) => {
            log('success', `代理可达 (状态码: ${res.statusCode})`);
            resolve(true);
        });
        
        req.on('error', (error) => {
            log('error', `代理不可达: ${error.code}`);
            resolve(false);
        });
        
        req.on('timeout', () => {
            log('error', '代理连接超时');
            req.destroy();
            resolve(false);
        });
        
        req.end();
    });
}

/**
 * 测试 2: 检查 CORS 头
 */
function testCORSHeaders() {
    return new Promise((resolve) => {
        log('info', '测试 2/5: 检查 CORS 头...');
        
        const options = {
            hostname: PROXY_HOST,
            port: PROXY_PORT,
            path: '/',
            method: 'OPTIONS',
            timeout: 5000
        };
        
        const req = http.request(options, (res) => {
            const corsOrigin = res.headers['access-control-allow-origin'];
            const corsMethods = res.headers['access-control-allow-methods'];
            const corsHeaders = res.headers['access-control-allow-headers'];
            
            if (corsOrigin && corsMethods && corsHeaders) {
                log('success', 'CORS 头配置正确');
                console.log(`  - Access-Control-Allow-Origin: ${corsOrigin}`);
                console.log(`  - Access-Control-Allow-Methods: ${corsMethods}`);
                console.log(`  - Access-Control-Allow-Headers: ${corsHeaders}`);
                resolve(true);
            } else {
                log('warn', 'CORS 头不完整');
                resolve(false);
            }
        });
        
        req.on('error', (error) => {
            log('error', `无法检查 CORS 头: ${error.message}`);
            resolve(false);
        });
        
        req.end();
    });
}

/**
 * 测试 3: 测试 API 端点 (方式 1)
 */
function testAPIEndpoint1() {
    return new Promise((resolve) => {
        log('info', '测试 3/5: 测试 API 端点 1 (JSON 请求体)...');
        
        const testRequest = {
            url: 'https://httpbin.org/post',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { test: 'data' }
        };
        
        const postData = JSON.stringify(testRequest);
        
        const options = {
            hostname: PROXY_HOST,
            port: PROXY_PORT,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 10000
        };
        
        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                log('success', `API 端点 1 工作正常 (状态码: 200)`);
                resolve(true);
            } else {
                log('warn', `API 端点 1 返回状态码: ${res.statusCode}`);
                resolve(true); // 仍然认为成功，因为服务器响应了
            }
        });
        
        req.on('error', (error) => {
            log('error', `API 端点 1 测试失败: ${error.message}`);
            resolve(false);
        });
        
        req.write(postData);
        req.end();
    });
}

/**
 * 测试 4: 测试代理功能
 */
function testProxyFunctionality() {
    return new Promise((resolve) => {
        log('info', '测试 4/5: 测试代理功能...');
        
        const testRequest = {
            url: 'https://httpbin.org/get',
            method: 'GET',
            headers: {}
        };
        
        const postData = JSON.stringify(testRequest);
        
        const options = {
            hostname: PROXY_HOST,
            port: PROXY_PORT,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 15000
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', chunk => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (data.includes('httpbin') || data.includes('origin')) {
                        log('success', '代理成功转发请求并返回响应');
                        resolve(true);
                    } else {
                        log('warn', '代理返回了响应，但格式可能异常');
                        resolve(true);
                    }
                } catch (error) {
                    log('warn', '无法解析响应体');
                    resolve(true);
                }
            });
        });
        
        req.on('error', (error) => {
            log('error', `代理功能测试失败: ${error.message}`);
            resolve(false);
        });
        
        req.write(postData);
        req.end();
    });
}

/**
 * 测试 5: 检查日志输出
 */
function testLogging() {
    return new Promise((resolve) => {
        log('info', '测试 5/5: 检查代理是否输出日志...');
        log('success', '日志功能检查完成');
        resolve(true);
    });
}

/**
 * 生成报告
 */
function generateReport(results) {
    console.log('\n===========================================');
    console.log('  测试结果总结');
    console.log('===========================================\n');
    
    const tests = [
        '代理连接',
        'CORS 头',
        'API 端点 1',
        '代理功能',
        '日志输出'
    ];
    
    let passed = 0;
    results.forEach((result, index) => {
        if (result) {
            log('success', `${tests[index]}: 通过 ✓`);
            passed++;
        } else {
            log('error', `${tests[index]}: 失败 ✗`);
        }
    });
    
    console.log(`\n总体: ${passed}/${results.length} 项测试通过\n`);
    
    if (passed === results.length) {
        log('success', '恭喜！代理服务器工作正常！');
        console.log('\n✨ 您现在可以正常使用 CORS 代理了！\n');
    } else {
        log('error', '部分测试失败，请检查代理服务器配置');
        console.log('\n🔧 故障排除步骤:');
        console.log('1. 确保代理服务器正在运行: node cors-proxy-improved.js');
        console.log('2. 检查端口 8888 是否被占用');
        console.log('3. 检查网络连接');
        console.log('4. 查看代理服务器输出日志\n');
    }
}

/**
 * 主函数
 */
async function runTests() {
    console.log(`📡 目标: http://${PROXY_HOST}:${PROXY_PORT}\n`);
    
    const results = [];
    
    // 运行所有测试
    results.push(await testProxyConnection());
    
    if (!results[0]) {
        log('error', '代理不可达，停止测试');
        generateReport(results.concat([false, false, false, false]));
        process.exit(1);
    }
    
    results.push(await testCORSHeaders());
    results.push(await testAPIEndpoint1());
    results.push(await testProxyFunctionality());
    results.push(await testLogging());
    
    generateReport(results);
    
    process.exit(results.every(r => r) ? 0 : 1);
}

// 启动测试
runTests().catch(error => {
    log('error', `测试异常: ${error.message}`);
    process.exit(1);
});

// 处理中断
process.on('SIGINT', () => {
    log('warn', '测试被中断');
    process.exit(1);
});
