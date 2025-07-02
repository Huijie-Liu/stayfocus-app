// StayFocus Content Script
class StayFocusContent {
    constructor() {
        this.isActive = false;
        this.blockedSites = [];
        this.currentHostname = window.location.hostname.replace('www.', '');
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.checkCurrentSite();
        this.setupPageMonitoring();
    }

    // 加载设置
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['isActive', 'blockedSites']);
            this.isActive = result.isActive || false;
            this.blockedSites = result.blockedSites || [];
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    // 检查当前网站是否被屏蔽
    checkCurrentSite() {
        if (!this.isActive) return;

        const isBlocked = this.blockedSites.some(site => 
            this.currentHostname.includes(site) || site.includes(this.currentHostname)
        );

        if (isBlocked) {
            this.blockCurrentPage();
        }
    }

    // 屏蔽当前页面
    blockCurrentPage() {
        // 防止重复创建遮罩
        if (document.getElementById('stayfocus-overlay')) return;

        // 创建遮罩层
        const overlay = this.createBlockingOverlay();
        document.body.appendChild(overlay);

        // 阻止页面交互
        this.disablePageInteraction();

        // 通知背景脚本增加拦截计数
        chrome.runtime.sendMessage({
            action: 'incrementBlockedAttempts'
        });
    }

    // 创建屏蔽遮罩
    createBlockingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'stayfocus-overlay';
        overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            z-index: 2147483647 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            color: white !important;
            text-align: center !important;
            box-sizing: border-box !important;
            padding: 20px !important;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 500px !important;
            padding: 40px !important;
            background: rgba(255, 255, 255, 0.1) !important;
            border-radius: 16px !important;
            backdrop-filter: blur(10px) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
        `;

        content.innerHTML = `
            <div style="font-size: 64px !important; margin-bottom: 20px !important;">🎯</div>
            <h1 style="font-size: 32px !important; margin-bottom: 16px !important; font-weight: 600 !important; margin: 0 0 16px 0 !important;">保持专注！</h1>
            <p style="font-size: 18px !important; margin-bottom: 30px !important; opacity: 0.9 !important; line-height: 1.5 !important; margin: 0 0 30px 0 !important;">
                正在访问 <strong style="color: #FFD700 !important;">${this.currentHostname}</strong><br>
                这个网站已被StayFocus屏蔽，保持专注。
            </p>
            <div style="display: flex !important; gap: 16px !important; justify-content: center !important; flex-wrap: wrap !important;">
                <button id="stayfocus-back" style="
                    background: rgba(255,255,255,0.2) !important;
                    border: 2px solid rgba(255,255,255,0.3) !important;
                    color: white !important;
                    padding: 12px 24px !important;
                    border-radius: 8px !important;
                    font-size: 16px !important;
                    cursor: pointer !important;
                    transition: all 0.3s !important;
                    font-family: inherit !important;
                ">返回上一页</button>
                <button id="stayfocus-close" style="
                    background: rgba(255,255,255,0.2) !important;
                    border: 2px solid rgba(255,255,255,0.3) !important;
                    color: white !important;
                    padding: 12px 24px !important;
                    border-radius: 8px !important;
                    font-size: 16px !important;
                    cursor: pointer !important;
                    transition: all 0.3s !important;
                    font-family: inherit !important;
                ">关闭标签页</button>
            </div>
            <div style="margin-top: 30px !important;">
                <p style="font-size: 14px !important; opacity: 0.7 !important; margin: 0 0 15px 0 !important;">
                    想要访问此网站？请在StayFocus扩展中关闭专注模式。
                </p>
                <button id="stayfocus-disable" style="
                    background: rgba(255,255,255,0.1) !important;
                    border: 1px solid rgba(255,255,255,0.3) !important;
                    color: white !important;
                    padding: 8px 16px !important;
                    border-radius: 6px !important;
                    font-size: 14px !important;
                    cursor: pointer !important;
                    transition: all 0.3s !important;
                    font-family: inherit !important;
                ">临时关闭专注模式 (5分钟)</button>
            </div>
        `;

        overlay.appendChild(content);

        // 添加按钮事件
        this.setupOverlayEvents(overlay);

        return overlay;
    }

    // 设置遮罩事件
    setupOverlayEvents(overlay) {
        const backBtn = overlay.querySelector('#stayfocus-back');
        const closeBtn = overlay.querySelector('#stayfocus-close');
        const disableBtn = overlay.querySelector('#stayfocus-disable');

        backBtn.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.close();
            }
        });

        closeBtn.addEventListener('click', () => {
            window.close();
        });

        disableBtn.addEventListener('click', () => {
            this.temporaryDisable();
        });

        // 添加悬停效果
        [backBtn, closeBtn, disableBtn].forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.background = 'rgba(255,255,255,0.3)';
                button.style.transform = 'translateY(-2px)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = 'rgba(255,255,255,0.2)';
                button.style.transform = 'translateY(0)';
            });
        });
    }

    // 临时关闭专注模式
    temporaryDisable() {
        // 移除遮罩
        const overlay = document.getElementById('stayfocus-overlay');
        if (overlay) {
            overlay.remove();
        }

        // 恢复页面交互
        this.enablePageInteraction();

        // 设置5分钟后重新启用
        setTimeout(() => {
            this.checkCurrentSite();
        }, 5 * 60 * 1000);

        // 显示提示
        this.showTemporaryDisableNotification();
    }

    // 显示临时关闭通知
    showTemporaryDisableNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            background: #4F46E5 !important;
            color: white !important;
            padding: 12px 20px !important;
            border-radius: 8px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 14px !important;
            z-index: 2147483647 !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            animation: slideIn 0.3s ease-out !important;
        `;

        notification.innerHTML = `
            <div style="display: flex !important; align-items: center !important; gap: 8px !important;">
                <span>⏰</span>
                <span>专注模式已临时关闭 5 分钟</span>
            </div>
        `;

        document.body.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // 禁用页面交互
    disablePageInteraction() {
        document.body.style.overflow = 'hidden';
        
        // 阻止键盘事件
        document.addEventListener('keydown', this.preventEvent, true);
        document.addEventListener('keyup', this.preventEvent, true);
        document.addEventListener('keypress', this.preventEvent, true);
        
        // 阻止鼠标事件
        document.addEventListener('click', this.preventEvent, true);
        document.addEventListener('mousedown', this.preventEvent, true);
        document.addEventListener('mouseup', this.preventEvent, true);
        
        // 阻止滚动
        document.addEventListener('scroll', this.preventEvent, true);
        document.addEventListener('wheel', this.preventEvent, true);
        document.addEventListener('touchmove', this.preventEvent, true);
    }

    // 启用页面交互
    enablePageInteraction() {
        document.body.style.overflow = '';
        
        // 移除事件监听器
        document.removeEventListener('keydown', this.preventEvent, true);
        document.removeEventListener('keyup', this.preventEvent, true);
        document.removeEventListener('keypress', this.preventEvent, true);
        document.removeEventListener('click', this.preventEvent, true);
        document.removeEventListener('mousedown', this.preventEvent, true);
        document.removeEventListener('mouseup', this.preventEvent, true);
        document.removeEventListener('scroll', this.preventEvent, true);
        document.removeEventListener('wheel', this.preventEvent, true);
        document.removeEventListener('touchmove', this.preventEvent, true);
    }

    // 阻止事件
    preventEvent(e) {
        // 允许StayFocus遮罩上的事件
        if (e.target.closest('#stayfocus-overlay')) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }

    // 设置页面监控
    setupPageMonitoring() {
        // 监听存储变化
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync') {
                if (changes.isActive) {
                    this.isActive = changes.isActive.newValue;
                    if (!this.isActive) {
                        this.removeBlockingOverlay();
                    } else {
                        this.checkCurrentSite();
                    }
                }
                
                if (changes.blockedSites) {
                    this.blockedSites = changes.blockedSites.newValue;
                    this.checkCurrentSite();
                }
            }
        });

        // 监听页面变化（SPA应用）
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                this.currentHostname = window.location.hostname.replace('www.', '');
                setTimeout(() => this.checkCurrentSite(), 100);
            }
        }).observe(document, { subtree: true, childList: true });
    }

    // 移除屏蔽遮罩
    removeBlockingOverlay() {
        const overlay = document.getElementById('stayfocus-overlay');
        if (overlay) {
            overlay.remove();
            this.enablePageInteraction();
        }
    }
}

// 等待DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new StayFocusContent();
    });
} else {
    new StayFocusContent();
}

