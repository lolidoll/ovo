/**
 * 改进的本地CORS代理客户端
 * 提供可靠的API调用方案
 */

// 配置
const PROXY_CONFIG = {
    // 本地代理（首选）
    LOCAL_PROXY: 'http://127.0.0.1:8888',
    
    // 公共代理备选
    PUBLIC_PROXIES: [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url='
    ],
    
    // 公共CORS代理服务
    CORS_SERVICES: [
        {
            name: 'corsproxy.io',
            url: 'https://corsproxy.io/?'
        },
        {
            name: 'allorigins',
            url: 'https://api.allorigins.win/raw?url='
        }
    ]
};

let publicProxyIndex = 0;

/**
 * 检查本地代理是否可用
 */
async function checkLocalProxy() {
    try {
        const response = await fetch(PROXY_CONFIG.LOCAL_PROXY, {
            method: 'OPTIONS',
            timeout: 3000
        });
        return response.ok;
    } catch (error) {
        console.warn('⚠️ 本地代理不可用:', error.message);
        return false;
    }
}

/**
 * 使用本地代理调用API
 */
async function callAPIWithLocalProxy(apiUrl, options = {}) {
    const proxyUrl = `${PROXY_CONFIG.LOCAL_PROXY}/`;
    
    const proxyOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        body: JSON.stringify({
            url: apiUrl,
            method: options.method || 'POST',
            headers: options.headers || {},
            body: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined
        })
    };
    
    try {
        const response = await fetch(proxyUrl, proxyOptions);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    } catch (error) {
        console.error('本地代理调用失败:', error);
        throw error;
    }
}

/**
 * 使用公共代理调用API
 */
async function callAPIWithPublicProxy(apiUrl, options = {}) {
    const proxyService = PROXY_CONFIG.CORS_SERVICES[publicProxyIndex];
    const proxyUrl = proxyService.url + encodeURIComponent(apiUrl);
    
    try {
        console.log(`📡 尝试使用 ${proxyService.name} 代理`);
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers
            },
            body: options.body
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        console.warn(`❌ ${proxyService.name} 失败:`, error.message);
        
        // 尝试下一个代理
        if (publicProxyIndex < PROXY_CONFIG.CORS_SERVICES.length - 1) {
            publicProxyIndex++;
            return callAPIWithPublicProxy(apiUrl, options);
        }
        
        throw error;
    }
}

/**
 * 主调用函数 - 自动选择可用的代理
 */
async function fetchWithSmartProxy(apiUrl, options = {}) {
    // 方案 1: 先尝试直接调用（如果CORS允许）
    try {
        console.log('🔄 尝试直接调用API...');
        const response = await fetch(apiUrl, {
            ...options,
            timeout: 5000
        });
        if (response.ok) {
            console.log('✅ 直接调用成功');
            return response;
        }
    } catch (directError) {
        console.warn('⚠️ 直接调用失败:', directError.message);
    }
    
    // 方案 2: 使用本地代理
    try {
        console.log('🔄 尝试本地代理...');
        const localProxyAvailable = await checkLocalProxy();
        
        if (localProxyAvailable) {
            console.log('✅ 本地代理可用，正在使用...');
            return await callAPIWithLocalProxy(apiUrl, options);
        }
    } catch (localError) {
        console.warn('⚠️ 本地代理调用失败:', localError.message);
    }
    
    // 方案 3: 使用公共代理
    try {
        console.log('🔄 尝试公共CORS代理...');
        return await callAPIWithPublicProxy(apiUrl, options);
    } catch (publicError) {
        console.error('❌ 所有代理方案都失败了:', publicError.message);
        throw new Error(
            '无法调用API。\n' +
            '请尝试以下解决方案：\n' +
            '1. 启动本地CORS代理: node cors-proxy-improved.js\n' +
            '2. 或检查网络连接\n' +
            '3. 或配置正确的API_KEY'
        );
    }
}

/**
 * 便利函数 - 调用OpenAI兼容API
 */
async function callOpenAICompatibleAPI(apiUrl, apiKey, model, messages, options = {}) {
    const {
        temperature = 0.8,
        maxTokens = 1000,
        topP = 0.9
    } = options;
    
    const requestBody = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP
    };
    
    try {
        const response = await fetchWithSmartProxy(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('API返回格式不正确');
        }
        
        return data.choices[0].message.content;
    } catch (error) {
        console.error('API调用失败:', error);
        throw error;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchWithSmartProxy,
        callOpenAICompatibleAPI,
        callAPIWithLocalProxy,
        callAPIWithPublicProxy,
        checkLocalProxy,
        PROXY_CONFIG
    };
}

// 提供全局函数供HTML/JS使用
if (typeof window !== 'undefined') {
    window.fetchWithSmartProxy = fetchWithSmartProxy;
    window.callOpenAICompatibleAPI = callOpenAICompatibleAPI;
}
