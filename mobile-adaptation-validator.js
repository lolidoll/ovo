/**
 * 移动端适配快速验证脚本
 * 在浏览器控制台运行此脚本进行快速验证
 */

const MobileAdaptationValidator = {
    // 验证所有功能
    validateAll: function() {
        console.clear();
        console.log('%c🚀 移动端适配验证开始', 'font-size: 16px; color: #00aa00; font-weight: bold;');
        console.log('');
        
        this.validateScripts();
        this.validateCSS();
        this.validateDeviceDetection();
        this.validateBrowserDetection();
        this.validateDisplayMode();
        this.validateViewport();
        this.validateSafeArea();
        this.validateAdaptationScheme();
        this.validatePageZoom();
        
        console.log('');
        console.log('%c✅ 验证完成', 'font-size: 16px; color: #00aa00; font-weight: bold;');
    },

    // 验证脚本加载
    validateScripts: function() {
        console.group('📦 脚本加载验证');
        
        const scripts = [
            { name: 'mobile-responsive-adapter.js', obj: 'MobileResponsiveAdapter' },
            { name: 'browser-compatibility-fix.js', obj: 'BrowserCompatibilityFix' },
        ];
        
        scripts.forEach(script => {
            if (window[script.obj]) {
                console.log(`✅ ${script.name} - 已加载`);
            } else {
                console.warn(`❌ ${script.name} - 未加载`);
            }
        });
        
        console.groupEnd();
    },

    // 验证CSS加载
    validateCSS: function() {
        console.group('🎨 CSS加载验证');
        
        const stylesheets = Array.from(document.styleSheets);
        const mobileCSS = stylesheets.some(sheet => 
            sheet.href && sheet.href.includes('mobile-responsive.css')
        );
        
        if (mobileCSS) {
            console.log('✅ mobile-responsive.css - 已加载');
        } else {
            console.warn('❌ mobile-responsive.css - 未加载');
        }
        
        console.groupEnd();
    },

    // 验证设备检测
    validateDeviceDetection: function() {
        console.group('📱 设备检测验证');
        
        if (!window.MobileResponsiveAdapter) {
            console.warn('❌ MobileResponsiveAdapter 未加载');
            return;
        }
        
        const adapter = window.MobileResponsiveAdapter;
        const devices = adapter.devices;
        
        console.log(`✅ 设备类型: ${devices.isPhone() ? '手机' : devices.isTablet() ? '平板' : '其他'}`);
        
        if (devices.isPhone()) {
            if (devices.isSmallPhone()) console.log('  └─ 小屏手机 (≤375px)');
            if (devices.isMediumPhone()) console.log('  └─ 中等手机 (375-414px)');
            if (devices.isLargePhone()) console.log('  └─ 大屏手机 (414-480px)');
        }
        
        console.groupEnd();
    },

    // 验证浏览器检测
    validateBrowserDetection: function() {
        console.group('🌐 浏览器检测验证');
        
        if (!window.MobileResponsiveAdapter) {
            console.warn('❌ MobileResponsiveAdapter 未加载');
            return;
        }
        
        const adapter = window.MobileResponsiveAdapter;
        const browsers = adapter.browsers;
        
        const detectedBrowsers = Object.entries(browsers)
            .filter(([key, value]) => value)
            .map(([key]) => key.replace('is', ''));
        
        if (detectedBrowsers.length > 0) {
            console.log(`✅ 检测到浏览器: ${detectedBrowsers.join(', ')}`);
        } else {
            console.warn('❌ 未检测到浏览器');
        }
        
        console.groupEnd();
    },

    // 验证显示模式
    validateDisplayMode: function() {
        console.group('🖥️ 显示模式验证');
        
        if (!window.MobileResponsiveAdapter) {
            console.warn('❌ MobileResponsiveAdapter 未加载');
            return;
        }
        
        const adapter = window.MobileResponsiveAdapter;
        const modes = adapter.displayModes;
        
        console.log(`✅ PWA模式: ${modes.isPWA() ? '是' : '否'}`);
        console.log(`✅ 全屏模式: ${modes.isFullscreen ? '是' : '否'}`);
        console.log(`✅ 浏览器模式: ${modes.isBrowserMode() ? '是' : '否'}`);
        
        console.groupEnd();
    },

    // 验证视口
    validateViewport: function() {
        console.group('📐 视口验证');
        
        const styles = getComputedStyle(document.documentElement);
        const vh = styles.getPropertyValue('--vh');
        const appHeight = styles.getPropertyValue('--app-height');
        
        console.log(`✅ --vh: ${vh}`);
        console.log(`✅ --app-height: ${appHeight}`);
        console.log(`✅ window.innerHeight: ${window.innerHeight}px`);
        console.log(`✅ window.innerWidth: ${window.innerWidth}px`);
        
        console.groupEnd();
    },

    // 验证安全区域
    validateSafeArea: function() {
        console.group('🛡️ 安全区域验证');
        
        const styles = getComputedStyle(document.documentElement);
        const top = styles.getPropertyValue('--safe-area-inset-top');
        const bottom = styles.getPropertyValue('--safe-area-inset-bottom');
        const left = styles.getPropertyValue('--safe-area-inset-left');
        const right = styles.getPropertyValue('--safe-area-inset-right');
        
        console.log(`✅ --safe-area-inset-top: ${top}`);
        console.log(`✅ --safe-area-inset-bottom: ${bottom}`);
        console.log(`✅ --safe-area-inset-left: ${left}`);
        console.log(`✅ --safe-area-inset-right: ${right}`);
        
        console.groupEnd();
    },

    // 验证适配方案
    validateAdaptationScheme: function() {
        console.group('⚙️ 适配方案验证');
        
        const mode = localStorage.getItem('viewportAdaptMode') || 'auto';
        const styles = getComputedStyle(document.documentElement);
        const topPadding = styles.getPropertyValue('--top-padding');
        
        console.log(`✅ 当前适配方案: ${mode}`);
        console.log(`✅ 顶部padding: ${topPadding}`);
        
        console.groupEnd();
    },

    // 验证页面缩放
    validatePageZoom: function() {
        console.group('🔍 页面缩放验证');
        
        const scale = parseFloat(localStorage.getItem('pageZoomScale') || '1.0');
        const styles = getComputedStyle(document.documentElement);
        const pageScale = styles.getPropertyValue('--page-scale');
        
        console.log(`✅ 保存的缩放比例: ${scale}`);
        console.log(`✅ 当前缩放比例: ${pageScale}`);
        
        console.groupEnd();
    },

    // 获取完整的设备信息
    getFullDeviceInfo: function() {
        console.clear();
        console.log('%c📱 完整设备信息', 'font-size: 16px; color: #0066cc; font-weight: bold;');
        console.log('');
        
        if (window.MobileResponsiveAdapter) {
            const info = window.MobileResponsiveAdapter.getDeviceInfo();
            console.table(info);
        } else {
            console.warn('❌ MobileResponsiveAdapter 未加载');
        }
    },

    // 测试CSS变量
    testCSSVariables: function() {
        console.clear();
        console.log('%c🎨 CSS变量测试', 'font-size: 16px; color: #ff6600; font-weight: bold;');
        console.log('');
        
        const styles = getComputedStyle(document.documentElement);
        const variables = [
            '--vh',
            '--window-height',
            '--screen-height',
            '--app-height',
            '--nav-height',
            '--nav-safe-top',
            '--nav-total-height',
            '--safe-area-inset-top',
            '--safe-area-inset-bottom',
            '--safe-area-inset-left',
            '--safe-area-inset-right',
            '--page-scale',
        ];
        
        const data = {};
        variables.forEach(variable => {
            data[variable] = styles.getPropertyValue(variable).trim();
        });
        
        console.table(data);
    },

    // 测试CSS类名
    testCSSClasses: function() {
        console.clear();
        console.log('%c🏷️ CSS类名测试', 'font-size: 16px; color: #00cc00; font-weight: bold;');
        console.log('');
        
        const html = document.documentElement;
        const classes = Array.from(html.classList);
        
        console.log('已应用的CSS类名:');
        classes.forEach(cls => {
            console.log(`  ✅ ${cls}`);
        });
        
        if (classes.length === 0) {
            console.warn('❌ 未应用任何CSS类名');
        }
    },

    // 测试响应式断点
    testResponsiveBreakpoints: function() {
        console.clear();
        console.log('%c📊 响应式断点测试', 'font-size: 16px; color: #9900cc; font-weight: bold;');
        console.log('');
        
        const width = window.innerWidth;
        const breakpoints = {
            '小屏手机 (≤375px)': width <= 375,
            '中等手机 (375-414px)': width > 375 && width <= 414,
            '大屏手机 (414-480px)': width > 414 && width <= 480,
            '平板 (>480px)': width > 480,
        };
        
        console.log(`当前宽度: ${width}px`);
        console.log('');
        
        Object.entries(breakpoints).forEach(([name, matches]) => {
            console.log(`${matches ? '✅' : '❌'} ${name}`);
        });
    },

    // 测试浏览器兼容性
    testBrowserCompatibility: function() {
        console.clear();
        console.log('%c🌐 浏览器兼容性测试', 'font-size: 16px; color: #cc0000; font-weight: bold;');
        console.log('');
        
        if (window.BrowserCompatibilityFix) {
            const info = window.BrowserCompatibilityFix.getBrowserInfo();
            console.table(info);
        } else {
            console.warn('❌ BrowserCompatibilityFix 未加载');
        }
    },

    // 快速诊断
    quickDiagnosis: function() {
        console.clear();
        console.log('%c🔧 快速诊断', 'font-size: 16px; color: #ff9900; font-weight: bold;');
        console.log('');
        
        const checks = {
            'MobileResponsiveAdapter加载': !!window.MobileResponsiveAdapter,
            'BrowserCompatibilityFix加载': !!window.BrowserCompatibilityFix,
            'mobile-responsive.css加载': Array.from(document.styleSheets).some(sheet => 
                sheet.href && sheet.href.includes('mobile-responsive.css')
            ),
            'CSS变量--vh已设置': getComputedStyle(document.documentElement).getPropertyValue('--vh').trim() !== '',
            'CSS变量--nav-height已设置': getComputedStyle(document.documentElement).getPropertyValue('--nav-height').trim() !== '',
            'CSS类名已应用': document.documentElement.classList.length > 0,
        };
        
        Object.entries(checks).forEach(([check, result]) => {
            console.log(`${result ? '✅' : '❌'} ${check}`);
        });
        
        console.log('');
        console.log('诊断完成！');
    },
};

// 导出到全局作用域
window.MobileAdaptationValidator = MobileAdaptationValidator;

// 打印使用说明
console.log('%c移动端适配验证工具已加载', 'font-size: 14px; color: #0066cc; font-weight: bold;');
console.log('');
console.log('可用命令:');
console.log('  MobileAdaptationValidator.validateAll()        - 验证所有功能');
console.log('  MobileAdaptationValidator.getFullDeviceInfo()  - 获取完整设备信息');
console.log('  MobileAdaptationValidator.testCSSVariables()   - 测试CSS变量');
console.log('  MobileAdaptationValidator.testCSSClasses()     - 测试CSS类名');
console.log('  MobileAdaptationValidator.testResponsiveBreakpoints() - 测试响应式断点');
console.log('  MobileAdaptationValidator.testBrowserCompatibility() - 测试浏览器兼容性');
console.log('  MobileAdaptationValidator.quickDiagnosis()     - 快速诊断');
console.log('');
