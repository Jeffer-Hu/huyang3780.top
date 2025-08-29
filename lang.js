// lang.js
class CrossDomainLanguageSync {
    constructor(options = {}) {
        this.origin = options.origin || 'https://huyang3780.top'; // 您的域名
        this.storageKey = options.storageKey || 'preferredLanguage';
        this.availableLanguages = options.availableLanguages || ['cn', 'en', 'jp'];
        this.currentLanguage = this.availableLanguages[0]; // 默认中文
        this.isInitializing = true;
        this.otherWindows = []; // 存储其他窗口的引用

        this.init();
    }

    init() {
        this.loadLanguage();
        this.setupLanguageSelectors();
        this.bindEvents();

        // 短暂延迟后广播当前语言，避免其他页面未完全加载
        setTimeout(() => {
            this.broadcastLanguage();
            this.isInitializing = false;
        }, 1000);

        // 测试代码 - 可以添加到 lang.js 的 init 方法中
        console.log('Testing cross-domain communication...');
        
        // 尝试向父窗口发送消息（如果存在）
        if (window.parent !== window.self) {
            try {
                window.parent.postMessage({
                    type: 'LANGUAGE_TEST',
                    message: 'Testing connection from ' + window.location.hostname,
                    timestamp: Date.now()
                }, this.origin);
            } catch (e) {
                console.log('Cannot send message to parent:', e);
            }
        }
        
        // 尝试向 opener 发送消息（如果存在）
        if (window.opener && !window.opener.closed) {
            try {
                window.opener.postMessage({
                    type: 'LANGUAGE_TEST',
                    message: 'Testing connection from ' + window.location.hostname,
                    timestamp: Date.now()
                }, this.origin);
            } catch (e) {
                console.log('Cannot send message to opener:', e);
            }
        }
    }

    setupLanguageSelectors() {
        const selectors = [
            document.getElementById('language-selector'),
            document.getElementById('mobile-language-selector'),
            document.getElementById('footer-language-selector')
        ].filter(selector => selector !== null);

        selectors.forEach(selector => {
            // 确保下拉框显示当前语言
            if (this.availableLanguages.includes(selector.value)) {
                selector.value = this.currentLanguage;
            }
            selector.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        });
    }

    bindEvents() {
        // 监听来自其他页面的消息
        window.addEventListener('message', this.receiveMessage.bind(this));
        // 监听窗口获得焦点的事件，尝试与开启者同步
        window.addEventListener('focus', this.syncOnFocus.bind(this));

        // 监听 localStorage 事件 (用于同浏览器多个标签页同步)
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey && e.newValue) {
                this.applyLanguage(e.newValue, false);
            }
        });
    }

    receiveMessage(event) {
        // 重要：验证消息来源是否是你信任的域名
        if (event.origin !== this.origin) return;

        if (event.data && event.data.type === 'LANGUAGE_CHANGE') {
            const { language, source } = event.data;
            if (this.availableLanguages.includes(language) && language !== this.currentLanguage) {
                console.log(`Received language change from ${source}:`, language);
                this.applyLanguage(language, false); // 不再广播，避免循环
            }
        }

        // 如果是握手请求，则回复当前语言
        if (event.data && event.data.type === 'LANGUAGE_HANDSHAKE_REQUEST') {
            this.sendMessageToWindow(event.source, {
                type: 'LANGUAGE_HANDSHAKE_RESPONSE',
                language: this.currentLanguage,
                source: window.location.hostname
            });
        }

        // 如果是握手回复，则同步语言
        if (event.data && event.data.type === 'LANGUAGE_HANDSHAKE_RESPONSE') {
            const { language } = event.data;
            if (this.availableLanguages.includes(language) && language !== this.currentLanguage) {
                this.applyLanguage(language, false);
            }
        }
    }

    syncOnFocus() {
        // 窗口获得焦点时，尝试向可能存在的 opener 请求语言状态
        if (window.opener && !window.opener.closed) {
            this.sendMessageToWindow(window.opener, {
                type: 'LANGUAGE_HANDSHAKE_REQUEST',
                source: window.location.hostname
            });
        }
    }

    sendMessageToWindow(targetWindow, message) {
        // 安全地发送消息
        try {
            targetWindow.postMessage(message, this.origin);
        } catch (e) {
            console.error('Error sending message to window:', e);
        }
    }

    broadcastLanguage() {
        const message = {
            type: 'LANGUAGE_CHANGE',
            language: this.currentLanguage,
            source: window.location.hostname
        };

        // 1. 发送给父页面 (如果存在)
        if (window.parent !== window.self) {
            this.sendMessageToWindow(window.parent, message);
        }

        // 2. 发送给 opener (如果是从另一个页面打开的)
        if (window.opener && !window.opener.closed) {
            this.sendMessageToWindow(window.opener, message);
        }

        // 3. 发送给所有通过 window.open 打开的窗口
        this.otherWindows.forEach(win => {
            if (win && !win.closed) {
                this.sendMessageToWindow(win, message);
            }
        });

        // 4. 使用 localStorage 进行同源标签页同步
        try {
            localStorage.setItem(this.storageKey, this.currentLanguage);
        } catch (e) {
            console.error('LocalStorage set error:', e);
        }
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
        this.setupLanguageSelectors(); // 更新选择器状态

        if (broadcast) {
            this.broadcastLanguage();
        }
    }

    updateUI() {
        const lang = this.currentLanguage;
        // ... (您的UI更新逻辑，与之前一致)
        console.log(`UI updated to ${lang}`);
    }

    // 记录通过 window.open 打开的窗口
    addWindow(win) {
        this.otherWindows.push(win);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.languageSync = new CrossDomainLanguageSync();
});


