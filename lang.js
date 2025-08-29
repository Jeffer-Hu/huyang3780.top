// 确保类只定义一次
if (typeof CrossDomainLanguageSync === 'undefined') {
    class CrossDomainLanguageSync {
        constructor(options = {}) {
            this.origin = options.origin || 'https://huyang3780.top';
            this.storageKey = options.storageKey || 'preferredLanguage';
            this.availableLanguages = options.availableLanguages || ['cn', 'en', 'jp'];
            this.currentLanguage = this.availableLanguages[0];
            this.isInitializing = true;
            this.otherWindows = [];
            this.messageQueue = [];
            this.isConnected = false;

            // 存储实例引用以便全局访问
            window.__languageSyncInstance = this;
            
            this.init();
        }

        init() {
            console.log('Initializing CrossDomainLanguageSync...');
            
            // 首先尝试从URL参数获取语言设置
            const urlParams = new URLSearchParams(window.location.search);
            const urlLang = urlParams.get('lang');
            if (urlLang && this.availableLanguages.includes(urlLang)) {
                this.applyLanguage(urlLang, false);
            } else {
                this.loadLanguage();
            }
            
            this.setupLanguageSelectors();
            this.bindEvents();

            // 尝试建立连接
            setTimeout(() => {
                this.establishConnections();
                this.isInitializing = false;
            }, 1000);
            
            // 设置周期性连接检查
            setInterval(() => {
                this.checkConnections();
            }, 5000);
        }

        establishConnections() {
            console.log('Establishing connections...');
            
            // 尝试与父窗口通信
            if (window.parent !== window.self) {
                this.sendHandshake(window.parent);
            }
            
            // 尝试与打开者窗口通信
            if (window.opener && !window.opener.closed) {
                this.sendHandshake(window.opener);
            }
            
            // 尝试与所有iframe通信
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    this.sendHandshake(iframe.contentWindow);
                } catch (e) {
                    console.log('Cannot access iframe:', e);
                }
            });
            
            // 广播当前语言
            this.broadcastLanguage();
        }

        sendHandshake(targetWindow) {
            try {
                targetWindow.postMessage({
                    type: 'LANGUAGE_HANDSHAKE',
                    source: window.location.hostname,
                    language: this.currentLanguage,
                    timestamp: Date.now()
                }, this.origin);
                
                console.log('Handshake sent to:', targetWindow.location?.hostname || 'unknown');
            } catch (e) {
                console.log('Cannot send handshake:', e);
            }
        }

        checkConnections() {
            if (!this.isConnected) {
                console.log('No active connections, retrying...');
                this.establishConnections();
            }
        }

        setupLanguageSelectors() {
            const selectors = [
                document.getElementById('language-selector'),
                document.getElementById('mobile-language-selector'),
                document.getElementById('footer-language-selector')
            ].filter(selector => selector !== null);

            selectors.forEach(selector => {
                selector.value = this.currentLanguage;
                selector.addEventListener('change', (e) => {
                    this.changeLanguage(e.target.value);
                    
                    // 更新URL参数以保持一致性
                    this.updateUrlParameter('lang', e.target.value);
                });
            });
        }

        updateUrlParameter(key, value) {
            const url = new URL(window.location);
            url.searchParams.set(key, value);
            window.history.replaceState({}, '', url);
        }

        bindEvents() {
            // 监听来自其他页面的消息
            window.addEventListener('message', this.receiveMessage.bind(this));
            
            // 监听窗口获得焦点的事件
            window.addEventListener('focus', () => {
                this.syncOnFocus();
            });

            // 监听 localStorage 事件
            window.addEventListener('storage', (e) => {
                if (e.key === this.storageKey && e.newValue) {
                    this.applyLanguage(e.newValue, false);
                }
            });
            
            // 监听页面可见性变化
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.syncOnFocus();
                }
            });
        }

        receiveMessage(event) {
            // 验证消息来源
            if (event.origin !== this.origin) return;

            const data = event.data;
            if (!data || !data.type) return;

            console.log('Received message:', data.type, 'from:', event.origin);

            switch (data.type) {
                case 'LANGUAGE_HANDSHAKE':
                    this.isConnected = true;
                    console.log('Handshake received from:', data.source);
                    
                    // 回复握手确认
                    event.source.postMessage({
                        type: 'LANGUAGE_HANDSHAKE_ACK',
                        source: window.location.hostname,
                        language: this.currentLanguage,
                        timestamp: Date.now()
                    }, this.origin);
                    
                    // 如果对方的语言不同，同步语言
                    if (data.language && data.language !== this.currentLanguage) {
                        this.applyLanguage(data.language, false);
                    }
                    break;
                    
                case 'LANGUAGE_HANDSHAKE_ACK':
                    this.isConnected = true;
                    console.log('Handshake acknowledged by:', data.source);
                    
                    // 如果对方的语言不同，同步语言
                    if (data.language && data.language !== this.currentLanguage) {
                        this.applyLanguage(data.language, false);
                    }
                    break;
                    
                case 'LANGUAGE_CHANGE':
                    if (data.language && this.availableLanguages.includes(data.language)) {
                        console.log('Language change received:', data.language);
                        this.applyLanguage(data.language, false);
                    }
                    break;
                    
                case 'LANGUAGE_SYNC_REQUEST':
                    // 收到同步请求，发送当前语言
                    event.source.postMessage({
                        type: 'LANGUAGE_SYNC_RESPONSE',
                        source: window.location.hostname,
                        language: this.currentLanguage,
                        timestamp: Date.now()
                    }, this.origin);
                    break;
                    
                case 'LANGUAGE_SYNC_RESPONSE':
                    // 收到同步响应，更新语言
                    if (data.language && this.availableLanguages.includes(data.language)) {
                        this.applyLanguage(data.language, false);
                    }
                    break;
            }
        }

        syncOnFocus() {
            console.log('Window focused, syncing language...');
            
            // 发送同步请求给所有可能的窗口
            this.broadcastMessage({
                type: 'LANGUAGE_SYNC_REQUEST',
                source: window.location.hostname,
                timestamp: Date.now()
            });
        }

        broadcastMessage(message) {
            const targets = [];
            
            // 父窗口
            if (window.parent !== window.self) {
                targets.push(window.parent);
            }
            
            // 打开者窗口
            if (window.opener && !window.opener.closed) {
                targets.push(window.opener);
            }
            
            // 所有iframe
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    targets.push(iframe.contentWindow);
                } catch (e) {
                    console.log('Cannot access iframe:', e);
                }
            });
            
            // 发送消息
            targets.forEach(target => {
                try {
                    target.postMessage(message, this.origin);
                } catch (e) {
                    console.log('Cannot send message to target:', e);
                }
            });
            
            // 也使用localStorage进行同步
            if (message.type === 'LANGUAGE_CHANGE' && message.language) {
                try {
                    localStorage.setItem(this.storageKey, message.language);
                } catch (e) {
                    console.error('LocalStorage set error:', e);
                }
            }
        }

        broadcastLanguage() {
            this.broadcastMessage({
                type: 'LANGUAGE_CHANGE',
                language: this.currentLanguage,
                source: window.location.hostname,
                timestamp: Date.now()
            });
        }

        loadLanguage() {
            try {
                // 首先尝试从 localStorage 读取
                const savedLang = localStorage.getItem(this.storageKey);
                if (savedLang && this.availableLanguages.includes(savedLang)) {
                    this.applyLanguage(savedLang, false);
                    return;
                }
            } catch (e) {
                console.error('Read localStorage error:', e);
            }

            // 其次根据浏览器语言自动检测
            const browserLang = navigator.language.toLowerCase();
            if (browserLang.startsWith('zh')) {
                this.applyLanguage('cn', false);
            } else if (browserLang.startsWith('ja')) {
                this.applyLanguage('jp', false);
            } else {
                this.applyLanguage('en', false);
            }
        }

        changeLanguage(lang) {
            if (this.availableLanguages.includes(lang)) {
                this.applyLanguage(lang, true);
            }
        }

        applyLanguage(lang, broadcast = true) {
            if (this.currentLanguage === lang && !this.isInitializing) return;

            console.log(`Applying language: ${lang}, broadcast: ${broadcast}`);
            this.currentLanguage = lang;

            this.updateUI();
            this.setupLanguageSelectors();

            if (broadcast) {
                this.broadcastLanguage();
            }
        }

        updateUI() {
            const lang = this.currentLanguage;
            const translatableElements = document.querySelectorAll('[data-cn], [data-en], [data-jp]');
            
            translatableElements.forEach(element => {
                if (element.hasAttribute(`data-${lang}`)) {
                    const newContent = element.getAttribute(`data-${lang}`);
                    if (newContent !== element.innerHTML) {
                        element.innerHTML = newContent;
                    }
                }
            });
            
            const placeholderElements = document.querySelectorAll('[data-cn-placeholder], [data-en-placeholder], [data-jp-placeholder]');
            placeholderElements.forEach(element => {
                if (element.hasAttribute(`data-${lang}-placeholder`)) {
                    element.placeholder = element.getAttribute(`data-${lang}-placeholder`);
                }
            });
            
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
            
            document.documentElement.lang = lang === 'cn' ? 'zh-CN' : lang === 'jp' ? 'ja' : 'en';
            
            console.log(`UI updated to ${lang}`);
        }

        addWindow(win) {
            this.otherWindows.push(win);
        }
    }
}

// 初始化
if (typeof window.languageSync === 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.languageSync = new CrossDomainLanguageSync();
        
        // 添加全局函数以便调试
        window.getLanguageSyncState = function() {
            return {
                currentLanguage: window.languageSync.currentLanguage,
                isConnected: window.languageSync.isConnected,
                origin: window.languageSync.origin
            };
        };
        
        console.log('Language sync initialized');
    });
}
