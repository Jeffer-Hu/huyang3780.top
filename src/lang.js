// URL参数语言同步方案
document.addEventListener('DOMContentLoaded', function() {
    // 配置
    const availableLanguages = ['cn', 'en', 'jp'];
    const langParam = 'lang';
    const storageKey = 'preferredLanguage';
    
    // 初始化
    initLanguageSystem();
    
    function initLanguageSystem() {
        // 获取当前语言
        const currentLang = getCurrentLanguage();
        
        // 设置页面语言
        setLanguage(currentLang, false);
        
        // 设置语言选择器
        setupLanguageSelectors(currentLang);
        
        // 修改所有链接添加语言参数
        updateAllLinks(currentLang);
        
        console.log('URL参数语言同步已初始化，当前语言:', currentLang);
    }
    
    // 获取当前语言
    function getCurrentLanguage() {
        // 1. 首先检查URL参数
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get(langParam);
        if (urlLang && availableLanguages.includes(urlLang)) {
            // 保存到localStorage以便同域名下使用
            try {
                localStorage.setItem(storageKey, urlLang);
            } catch (e) {
                console.error('LocalStorage set error:', e);
            }
            return urlLang;
        }
        
        // 2. 检查localStorage（同域名同步）
        try {
            const storedLang = localStorage.getItem(storageKey);
            if (storedLang && availableLanguages.includes(storedLang)) {
                return storedLang;
            }
        } catch (e) {
            console.error('LocalStorage access error:', e);
        }
        
        // 3. 根据浏览器语言自动检测
        return detectBrowserLanguage();
    }
    
    // 检测浏览器语言
    function detectBrowserLanguage() {
        const browserLang = navigator.language.toLowerCase();
        if (browserLang.startsWith('zh')) {
            return 'cn';
        } else if (browserLang.startsWith('ja')) {
            return 'jp';
        } else {
            return 'en';
        }
    }
    
    // 设置语言选择器
    function setupLanguageSelectors(currentLang) {
        const selectors = [
            document.getElementById('language-selector'),
            document.getElementById('mobile-language-selector'),
            document.getElementById('footer-language-selector')
        ].filter(selector => selector !== null);

        selectors.forEach(selector => {
            selector.value = currentLang;
            selector.addEventListener('change', (e) => {
                const newLang = e.target.value;
                setLanguage(newLang, true);
                updateAllLinks(newLang);
                
                // 更新URL但不刷新页面
                updateUrlParameter(langParam, newLang);
            });
        });
    }
    
    // 设置语言
    function setLanguage(lang, persist = true) {
        if (!availableLanguages.includes(lang)) return;
        
        console.log(`Setting language to: ${lang}`);
        
        // 更新UI
        updateUI(lang);
        
        if (persist) {
            // 保存到localStorage（同域名同步）
            try {
                localStorage.setItem(storageKey, lang);
            } catch (e) {
                console.error('LocalStorage set error:', e);
            }
        }
    }
    
    // 更新UI元素
    function updateUI(lang) {
        // 更新文本内容
        const translatableElements = document.querySelectorAll('[data-cn], [data-en], [data-jp]');
        translatableElements.forEach(element => {
            if (element.hasAttribute(`data-${lang}`)) {
                const newContent = element.getAttribute(`data-${lang}`);
                if (newContent !== element.innerHTML) {
                    element.innerHTML = newContent;
                }
            }
        });
        
        // 更新placeholder
        const placeholderElements = document.querySelectorAll('[data-cn-placeholder], [data-en-placeholder], [data-jp-placeholder]');
        placeholderElements.forEach(element => {
            if (element.hasAttribute(`data-${lang}-placeholder`)) {
                element.placeholder = element.getAttribute(`data-${lang}-placeholder`);
            }
        });
        
        // 更新meta标签
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const pageTitle = document.getElementById('page-title');
        
        if (ogTitle && ogTitle.hasAttribute(`data-${lang}`)) {
            ogTitle.setAttribute('content', ogTitle.getAttribute(`data-${lang}`));
        }
        if (ogDesc && ogDesc.hasAttribute(`data-${lang}`)) {
            ogDesc.setAttribute('content', ogDesc.getAttribute(`data-${lang}`));
        }
        if (pageTitle && pageTitle.hasAttribute(`data-${lang}`)) {
            pageTitle.textContent = pageTitle.getAttribute(`data-${lang}`);
        }
        
        // 更新html lang属性
        document.documentElement.lang = lang === 'cn' ? 'zh-CN' : lang === 'jp' ? 'ja' : 'en';
        
        console.log(`UI updated to ${lang}`);
    }
    
    // 更新URL参数
    function updateUrlParameter(key, value) {
        const url = new URL(window.location);
        if (value) {
            url.searchParams.set(key, value);
        } else {
            url.searchParams.delete(key);
        }
        window.history.replaceState({}, '', url);
    }
    
    // 更新所有链接添加语言参数
    function updateAllLinks(lang) {
        // 获取所有链接
        const links = document.querySelectorAll('a');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            
            // 只处理站内链接
            if (href && isInternalLink(href)) {
                // 创建URL对象
                const url = new URL(href, window.location.origin);
                
                // 添加或更新语言参数
                url.searchParams.set(langParam, lang);
                
                // 更新链接
                link.setAttribute('href', url.toString());
            }
        });
        
        console.log('All links updated with language parameter:', lang);
    }
    
    // 检查是否为站内链接
    function isInternalLink(href) {
        // 排除锚点链接
        if (href.startsWith('#')) return false;
        
        // 排除javascript链接
        if (href.startsWith('javascript:')) return false;
        
        // 排除mailto和tel链接
        if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
        
        // 检查是否为同域链接
        try {
            const url = new URL(href, window.location.origin);
            return url.hostname === window.location.hostname || 
                   url.hostname.endsWith('.' + window.location.hostname);
        } catch (e) {
            // 相对路径
            return true;
        }
    }
    
    // 添加全局函数以便调试
    window.getCurrentLanguage = function() {
        return getCurrentLanguage();
    };
    
    window.updateAllLinks = function() {
        updateAllLinks(getCurrentLanguage());
    };
});

// 初始化语言同步
if (typeof window.languageSync === 'undefined') {
    window.languageSync = {
        version: '1.0',
        strategy: 'URL Parameters'
    };
    console.log('URL参数语言同步已初始化');
}