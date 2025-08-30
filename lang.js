// 确保类只定义一次
if (typeof CrossDomainLanguageSync === 'undefined') {
    class CrossDomainLanguageSync {
        constructor(options = {}) {
            // 配置选项
            this.domain = options.domain || '.huyang3780.top'; // Cookie域名
            this.cookieName = options.cookieName || 'preferred_language';
            this.storageKey = options.storageKey || 'preferredLanguage';
            this.availableLanguages = options.availableLanguages || ['cn', 'en', 'jp'];
            this.cookieExpires = options.cookieExpires || 365; // Cookie有效期（天）
            
            // 状态变量
            this.currentLanguage = this.availableLanguages[0];
            this.isInitializing = true;
            
            // 存储实例引用以便全局访问
            window.__languageSyncInstance = this;
            
            this.init();
        }

        init() {
            console.log('Initializing CrossDomainLanguageSync...');
            
            // 按优先级获取语言设置
            this.loadLanguage();
            
            // 设置语言选择器
            this.setupLanguageSelectors();
            
            // 绑定事件
            this.bindEvents();
            
            this.isInitializing = false;
        }

        // 获取当前语言（按优先级）
        loadLanguage() {
            // 1. 首先检查URL参数
            const urlParams = new URLSearchParams(window.location.search);
            const urlLang = urlParams.get('lang');
            if (urlLang && this.availableLanguages.includes(urlLang)) {
                this.applyLanguage(urlLang, true);
                return;
            }
            
            // 2. 检查Cookie（跨子域同步）
            const cookieLang = this.getCookie(this.cookieName);
            if (cookieLang && this.availableLanguages.includes(cookieLang)) {
                this.applyLanguage(cookieLang, true);
                return;
            }
            
            // 3. 检查localStorage（同域名同步）
            try {
                const storedLang = localStorage.getItem(this.storageKey);
                if (storedLang && this.availableLanguages.includes(storedLang)) {
                    this.applyLanguage(storedLang, true);
                    return;
                }
            } catch (e) {
                console.error('LocalStorage access error:', e);
            }
            
            // 4. 根据浏览器语言自动检测
            this.detectBrowserLanguage();
        }

        // 检测浏览器语言
        detectBrowserLanguage() {
            const browserLang = navigator.language.toLowerCase();
            let detectedLang = 'en'; // 默认英语
            
            if (browserLang.startsWith('zh')) {
                detectedLang = 'cn';
            } else if (browserLang.startsWith('ja')) {
                detectedLang = 'jp';
            }
            
            this.applyLanguage(detectedLang, true);
        }

        // 设置Cookie
        setCookie(name, value, expiresDays, path = '/') {
            const date = new Date();
            date.setTime(date.getTime() + (expiresDays * 24 * 60 * 60 * 1000));
            const expires = `expires=${date.toUTCString()}`;
            document.cookie = `${name}=${value};${expires};domain=${this.domain};path=${path}`;
        }

        // 获取Cookie
        getCookie(name) {
            const nameEQ = name + "=";
            const ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
            }
            return null;
        }

        // 删除Cookie
        deleteCookie(name, path = '/') {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${this.domain};path=${path}`;
        }

        // 设置语言选择器
        setupLanguageSelectors() {
            // 为所有语言选择器设置事件监听
            const selectors = [
                document.getElementById('language-selector'),
                document.getElementById('mobile-language-selector'),
                document.getElementById('footer-language-selector')
            ].filter(selector => selector !== null);

            selectors.forEach(selector => {
                selector.value = this.currentLanguage;
                selector.addEventListener('change', (e) => {
                    this.changeLanguage(e.target.value);
                });
            });
        }

        // 绑定事件
        bindEvents() {
            // 监听localStorage变化（同域名页面同步）
            window.addEventListener('storage', (e) => {
                if (e.key === this.storageKey && e.newValue && 
                    this.availableLanguages.includes(e.newValue) && 
                    e.newValue !== this.currentLanguage) {
                    this.applyLanguage(e.newValue, false);
                }
            });
        }

        // 更改语言
        changeLanguage(lang) {
            if (this.availableLanguages.includes(lang)) {
                this.applyLanguage(lang, true);
                
                // 更新URL参数
                this.updateUrlParameter('lang', lang);
            }
        }

        // 应用语言设置
        applyLanguage(lang, persist = true) {
            if (this.currentLanguage === lang && !this.isInitializing) return;
            
            console.log(`Applying language: ${lang}, persist: ${persist}`);
            this.currentLanguage = lang;
            
            // 更新UI
            this.updateUI();
            
            // 更新选择器
            this.setupLanguageSelectors();
            
            if (persist) {
                // 保存到localStorage（同域名同步）
                try {
                    localStorage.setItem(this.storageKey, lang);
                } catch (e) {
                    console.error('LocalStorage set error:', e);
                }
                
                // 保存到Cookie（跨子域同步）
                this.setCookie(this.cookieName, lang, this.cookieExpires);
            }
        }

        // 更新URL参数
        updateUrlParameter(key, value) {
            const url = new URL(window.location);
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
            window.history.replaceState({}, '', url);
        }

        // 更新UI元素
        updateUI() {
            const lang = this.currentLanguage;
            
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
    }

    // 初始化
    if (typeof window.languageSync === 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            window.languageSync = new CrossDomainLanguageSync();
            console.log('Language sync initialized with Cookie strategy');
        });
    }
}
