// StayFocus Popup JavaScript
class StayFocusPopup {
    constructor() {
        this.isActive = false;
        this.timer = null;
        this.timeLeft = 25 * 60; // 25分钟，单位秒
        this.blockedSites = ['facebook.com', 'twitter.com', 'youtube.com'];
        this.stats = {
            focusTime: 0,
            blockedAttempts: 0
        };
        
        this.init();
    }

    init() {
        this.loadData();
        this.bindEvents();
        this.updateUI();
    }

    // 加载存储的数据
    async loadData() {
        try {
            const result = await chrome.storage.sync.get([
                'isActive', 
                'blockedSites', 
                'stats', 
                'timeLeft'
            ]);
            
            this.isActive = result.isActive || false;
            this.blockedSites = result.blockedSites || ['facebook.com', 'twitter.com', 'youtube.com'];
            this.stats = result.stats || { focusTime: 0, blockedAttempts: 0 };
            this.timeLeft = result.timeLeft || 25 * 60;
            
            this.updateUI();
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    // 保存数据到存储
    async saveData() {
        try {
            await chrome.storage.sync.set({
                isActive: this.isActive,
                blockedSites: this.blockedSites,
                stats: this.stats,
                timeLeft: this.timeLeft
            });
        } catch (error) {
            console.error('保存数据失败:', error);
        }
    }

    // 绑定事件监听器
    bindEvents() {
        // 专注模式切换
        const focusModeToggle = document.getElementById('focusModeToggle');
        focusModeToggle.addEventListener('change', (e) => {
            this.toggleFocusMode(e.target.checked);
        });

        // 计时器控制
        document.getElementById('startTimer').addEventListener('click', () => {
            this.startTimer();
        });

        document.getElementById('pauseTimer').addEventListener('click', () => {
            this.pauseTimer();
        });

        document.getElementById('resetTimer').addEventListener('click', () => {
            this.resetTimer();
        });

        // 添加网站
        document.getElementById('addSiteBtn').addEventListener('click', () => {
            this.showAddSiteForm();
        });

        document.getElementById('confirmAddSite').addEventListener('click', () => {
            this.addSite();
        });

        document.getElementById('cancelAddSite').addEventListener('click', () => {
            this.hideAddSiteForm();
        });

        // 回车键添加网站
        document.getElementById('newSiteInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addSite();
            }
        });

        // 删除网站
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) {
                const site = e.target.dataset.site;
                this.removeSite(site);
            }
        });

        // 设置和帮助按钮
        document.getElementById('settingsBtn').addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });

        document.getElementById('helpBtn').addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://github.com/stayfocus/help' });
        });
    }

    // 切换专注模式
    async toggleFocusMode(enabled) {
        this.isActive = enabled;
        await this.saveData();
        
        // 通知背景脚本
        chrome.runtime.sendMessage({
            action: 'toggleFocusMode',
            enabled: enabled
        });
        
        this.updateUI();
    }

    // 开始计时器
    startTimer() {
        if (this.timer) return;
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                this.timerComplete();
            }
        }, 1000);
        
        document.getElementById('startTimer').style.display = 'none';
        document.getElementById('pauseTimer').style.display = 'inline-flex';
        
        // 自动启用专注模式
        if (!this.isActive) {
            document.getElementById('focusModeToggle').checked = true;
            this.toggleFocusMode(true);
        }
    }

    // 暂停计时器
    pauseTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        document.getElementById('startTimer').style.display = 'inline-flex';
        document.getElementById('pauseTimer').style.display = 'none';
    }

    // 重置计时器
    resetTimer() {
        this.pauseTimer();
        this.timeLeft = 25 * 60;
        this.updateTimerDisplay();
        this.saveData();
    }

    // 计时器完成
    timerComplete() {
        this.pauseTimer();
        this.stats.focusTime += 25;
        this.saveData();
        
        // 显示完成通知
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'StayFocus',
            message: '恭喜！已完成25分钟的专注时间！'
        });
        
        // 重置计时器
        this.resetTimer();
    }

    // 显示添加网站表单
    showAddSiteForm() {
        document.getElementById('addSiteForm').style.display = 'block';
        document.getElementById('newSiteInput').focus();
    }

    // 隐藏添加网站表单
    hideAddSiteForm() {
        document.getElementById('addSiteForm').style.display = 'none';
        document.getElementById('newSiteInput').value = '';
    }

    // 添加网站到屏蔽列表
    async addSite() {
        const input = document.getElementById('newSiteInput');
        const site = input.value.trim().toLowerCase();
        
        if (!site) return;
        
        // 验证域名格式
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(site)) {
            alert('请输入有效的域名格式 (例如: example.com)');
            return;
        }
        
        if (this.blockedSites.includes(site)) {
            alert('该网站已在屏蔽列表中');
            return;
        }
        
        this.blockedSites.push(site);
        await this.saveData();
        this.updateSitesList();
        this.hideAddSiteForm();
        
        // 通知背景脚本更新规则
        chrome.runtime.sendMessage({
            action: 'updateBlockedSites',
            sites: this.blockedSites
        });
    }

    // 从屏蔽列表移除网站
    async removeSite(site) {
        const index = this.blockedSites.indexOf(site);
        if (index > -1) {
            this.blockedSites.splice(index, 1);
            await this.saveData();
            this.updateSitesList();
            
            // 通知背景脚本更新规则
            chrome.runtime.sendMessage({
                action: 'updateBlockedSites',
                sites: this.blockedSites
            });
        }
    }

    // 更新UI
    updateUI() {
        // 更新状态指示器
        const statusIndicator = document.getElementById('statusIndicator');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');
        
        if (this.isActive) {
            statusDot.classList.add('active');
            statusText.textContent = '已启用';
        } else {
            statusDot.classList.remove('active');
            statusText.textContent = '已关闭';
        }
        
        // 更新专注模式开关
        document.getElementById('focusModeToggle').checked = this.isActive;
        
        // 更新计时器显示
        this.updateTimerDisplay();
        
        // 更新网站列表
        this.updateSitesList();
        
        // 更新统计信息
        this.updateStats();
    }

    // 更新计时器显示
    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timerDisplay').textContent = display;
    }

    // 更新网站列表
    updateSitesList() {
        const sitesList = document.getElementById('sitesList');
        sitesList.innerHTML = '';
        
        this.blockedSites.forEach(site => {
            const siteItem = document.createElement('div');
            siteItem.className = 'site-item';
            siteItem.innerHTML = `
                <span class="site-url">${site}</span>
                <button class="remove-btn" data-site="${site}">×</button>
            `;
            sitesList.appendChild(siteItem);
        });
    }

    // 更新统计信息
    updateStats() {
        const focusHours = Math.floor(this.stats.focusTime / 60);
        const focusMinutes = this.stats.focusTime % 60;
        let focusTimeText = '';
        
        if (focusHours > 0) {
            focusTimeText = `${focusHours}h ${focusMinutes}m`;
        } else {
            focusTimeText = `${focusMinutes}m`;
        }
        
        document.getElementById('focusTime').textContent = focusTimeText;
        document.getElementById('blockedAttempts').textContent = this.stats.blockedAttempts.toString();
    }

    // 格式化时间显示
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    }
}

// 当DOM加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
    new StayFocusPopup();
});

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateStats') {
        // 更新统计信息
        const popup = window.stayFocusPopup;
        if (popup) {
            popup.stats = message.stats;
            popup.updateStats();
        }
    }
});

