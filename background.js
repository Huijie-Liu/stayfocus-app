// StayFocus Background Script
class StayFocusBackground {
    constructor() {
        this.isActive = false;
        this.blockedSites = ['facebook.com', 'twitter.com', 'youtube.com'];
        this.stats = {
            focusTime: 0,
            blockedAttempts: 0
        };
        this.rules = [];
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateBlockingRules();
    }

    // 加载存储的数据
    async loadData() {
        try {
            const result = await chrome.storage.sync.get([
                'isActive', 
                'blockedSites', 
                'stats'
            ]);
            
            this.isActive = result.isActive || false;
            this.blockedSites = result.blockedSites || ['facebook.com', 'twitter.com', 'youtube.com'];
            this.stats = result.stats || { focusTime: 0, blockedAttempts: 0 };
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    // 保存数据
    async saveData() {
        try {
            await chrome.storage.sync.set({
                isActive: this.isActive,
                blockedSites: this.blockedSites,
                stats: this.stats
            });
        } catch (error) {
            console.error('保存数据失败:', error);
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        // 监听来自popup的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });

        // 监听标签页更新
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.checkTabUrl(tab);
            }
        });

        // 监听标签页激活
        chrome.tabs.onActivated.addListener((activeInfo) => {
            chrome.tabs.get(activeInfo.tabId, (tab) => {
                if (tab.url) {
                    this.checkTabUrl(tab);
                }
            });
        });

        // 监听网络请求（用于统计拦截次数）
        chrome.webRequest.onBeforeRequest.addListener(
            (details) => {
                if (this.isActive && this.shouldBlockUrl(details.url)) {
                    this.stats.blockedAttempts++;
                    this.saveData();
                    this.sendStatsUpdate();
                    return { cancel: true };
                }
            },
            { urls: ["<all_urls>"] },
            ["blocking"]
        );

        // 监听扩展安装
        chrome.runtime.onInstalled.addListener(() => {
            this.createContextMenus();
        });

        // 监听闹钟（用于定时任务）
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'dailyReset') {
                this.resetDailyStats();
            }
        });

        // 设置每日重置闹钟
        chrome.alarms.create('dailyReset', {
            when: this.getNextMidnight(),
            periodInMinutes: 24 * 60
        });
    }

    // 处理消息
    async handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'toggleFocusMode':
                this.isActive = message.enabled;
                await this.saveData();
                this.updateBlockingRules();
                break;

            case 'updateBlockedSites':
                this.blockedSites = message.sites;
                await this.saveData();
                this.updateBlockingRules();
                break;

            case 'getStats':
                sendResponse(this.stats);
                break;

            case 'addFocusTime':
                this.stats.focusTime += message.minutes;
                await this.saveData();
                this.sendStatsUpdate();
                break;
        }
    }

    // 检查标签页URL
    checkTabUrl(tab) {
        if (!this.isActive) return;

        const url = new URL(tab.url);
        const hostname = url.hostname.replace('www.', '');

        if (this.blockedSites.some(site => hostname.includes(site))) {
            // 注入阻止脚本
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: this.injectBlockingScript,
                args: [hostname]
            });
        }
    }

    // 注入阻止脚本
    injectBlockingScript(hostname) {
        // 创建全屏遮罩
        const overlay = document.createElement('div');
        overlay.id = 'stayfocus-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
            text-align: center;
        `;

        overlay.innerHTML = `
            <div style="max-width: 500px; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">🎯</div>
                <h1 style="font-size: 32px; margin-bottom: 16px; font-weight: 600;">保持专注！</h1>
                <p style="font-size: 18px; margin-bottom: 30px; opacity: 0.9;">
                    正在访问 <strong>${hostname}</strong><br>
                    这个网站已被StayFocus屏蔽，保持专注。
                </p>
                <div style="display: flex; gap: 16px; justify-content: center;">
                    <button id="stayfocus-back" style="
                        background: rgba(255,255,255,0.2);
                        border: 2px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">返回上一页</button>
                    <button id="stayfocus-close" style="
                        background: rgba(255,255,255,0.2);
                        border: 2px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">关闭标签页</button>
                </div>
                <p style="font-size: 14px; margin-top: 30px; opacity: 0.7;">
                    想要访问此网站？请在StayFocus扩展中关闭专注模式。
                </p>
            </div>
        `;

        // 添加按钮事件
        overlay.querySelector('#stayfocus-back').addEventListener('click', () => {
            history.back();
        });

        overlay.querySelector('#stayfocus-close').addEventListener('click', () => {
            window.close();
        });

        // 添加悬停效果
        const buttons = overlay.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.background = 'rgba(255,255,255,0.3)';
                button.style.transform = 'translateY(-2px)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = 'rgba(255,255,255,0.2)';
                button.style.transform = 'translateY(0)';
            });
        });

        document.body.appendChild(overlay);

        // 阻止页面滚动
        document.body.style.overflow = 'hidden';
    }

    // 检查是否应该阻止URL
    shouldBlockUrl(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.replace('www.', '');
            return this.blockedSites.some(site => hostname.includes(site));
        } catch (error) {
            return false;
        }
    }

    // 更新阻止规则
    async updateBlockingRules() {
        try {
            // 清除现有规则
            const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
            const ruleIds = existingRules.map(rule => rule.id);
            
            if (ruleIds.length > 0) {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: ruleIds
                });
            }

            // 如果专注模式启用，添加新规则
            if (this.isActive) {
                const newRules = this.blockedSites.map((site, index) => ({
                    id: index + 1,
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        urlFilter: `*://*.${site}/*`,
                        resourceTypes: ['main_frame']
                    }
                }));

                await chrome.declarativeNetRequest.updateDynamicRules({
                    addRules: newRules
                });
            }
        } catch (error) {
            console.error('更新阻止规则失败:', error);
        }
    }

    // 创建右键菜单
    createContextMenus() {
        chrome.contextMenus.create({
            id: 'toggleFocus',
            title: '切换专注模式',
            contexts: ['action']
        });

        chrome.contextMenus.create({
            id: 'addCurrentSite',
            title: '将当前网站加入屏蔽列表',
            contexts: ['page']
        });

        chrome.contextMenus.onClicked.addListener((info, tab) => {
            if (info.menuItemId === 'toggleFocus') {
                this.isActive = !this.isActive;
                this.saveData();
                this.updateBlockingRules();
            } else if (info.menuItemId === 'addCurrentSite') {
                const url = new URL(tab.url);
                const hostname = url.hostname.replace('www.', '');
                if (!this.blockedSites.includes(hostname)) {
                    this.blockedSites.push(hostname);
                    this.saveData();
                    this.updateBlockingRules();
                    
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon48.png',
                        title: 'StayFocus',
                        message: `已将 ${hostname} 添加到屏蔽列表`
                    });
                }
            }
        });
    }

    // 发送统计更新
    sendStatsUpdate() {
        chrome.runtime.sendMessage({
            action: 'updateStats',
            stats: this.stats
        }).catch(() => {
            // 忽略错误，popup可能未打开
        });
    }

    // 重置每日统计
    resetDailyStats() {
        this.stats = {
            focusTime: 0,
            blockedAttempts: 0
        };
        this.saveData();
    }

    // 获取下一个午夜时间
    getNextMidnight() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return midnight.getTime();
    }
}

// 初始化背景脚本
new StayFocusBackground();

