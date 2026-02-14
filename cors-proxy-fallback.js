/**
 * CORS代理备用方案
 * 使用公共CORS代理服务，无需本地服务器
 */

// 公共CORS代理服务列表
const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/'
];

// 当前使用的代理索引
let currentProxyIndex = 0;

/**
 * 通过公共CORS代理发送请求
 */
async function fetchWithProxy(url, options = {}) {
    const proxyUrl = CORS_PROXIES[currentProxyIndex] + encodeURIComponent(url);
    
    try {
        const response = await fetch(proxyUrl, {
            ...options,
            headers: {
                ...options.headers,
                // 移除可能导致代理问题的headers
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        console.warn(`代理 ${currentProxyIndex + 1} 失败:`, error.message);
        
        // 尝试下一个代理
        if (currentProxyIndex < CORS_PROXIES.length - 1) {
            currentProxyIndex++;
            console.log(`尝试代理 ${currentProxyIndex + 1}...`);
            return fetchWithProxy(url, options);
        }
        
        throw new Error('所有CORS代理都失败了，请安装并启动本地代理服务器');
    }
}

/**
 * 调用OpenAI兼容的API（通过CORS代理）
 */
async function callAPIWithCORSProxy(apiUrl, apiKey, model, messages, temperature = 0.8, maxTokens = 1000) {
    try {
        const requestBody = {
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens
        };
        
        // 使用公共CORS代理
        const response = await fetchWithProxy(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('API调用失败:', error);
        throw error;
    }
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchWithProxy,
        callAPIWithCORSProxy
    };
}