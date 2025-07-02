// StayFocus Options JavaScript
class StayFocusOptions {
    constructor() {
        this.settings = {
            autoStart: false,
            showNotifications: true,
            strictMode: false,
            defaultFocusTime: 25,
            breakTime: 5,
            autoNextRound: false
        };
        this.blockedSites = ['facebook.com', 'twitter.com', 'youtube.com'];
        this.stats = {
            todayFocusTime: 0,
            weekFocusTime: 0,
            totalBlocked: 0,
            streakDays: 0
        };
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.bindEvents();
        this.updateUI();
    }

    // 加载数据
    async loadData() {
        try {
            const result = await chrome.storage.sync.get([
                'settings',
                'blockedSites',
                'stats'
            ]);
            
            this.settings = { ...this.settings, ...result.settings };
            this.blockedSites = result.blockedSites || this.blockedSites;
            this.stats = { ...this.stats, ...result.stats };
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    // 保存数据
    async saveData() {
        try {
            await chrome.storage.sync.set({
                settings: this.settings,
                blockedSites: this.blockedSites,
                stats: this.stats
            });
        } catch (error) {
            console.error('保存数据失败:', error);
        }
    }

    // 绑定事件
    bindEvents() {
        // 基本设置
        document.getElementById('autoStart').addEventListener('change', (e) => {
            this.settings.autoStart = e.target.checked;
            this.saveData();
        });

        document.getElementById('showNotifications').addEventListener('change', (e) => {
            this.settings.showNotifications = e.target.checked;
            this.saveData();
        });

        document.getElementById('strictMode').addEventListener('change', (e) => {
            this.settings.strictMode = e.target.checked;
            this.saveData();
        });

        // 计时器设置
        document.getElementById('defaultFocusTime').addEventListener('change', (e) => {
            this.settings.defaultFocusTime = parseInt(e.target.value);
            this.saveData();
        });

        document.getElementById('breakTime').addEventListener('change', (e) => {
            this.settings.breakTime = parseInt(e.target.value);
            this.saveData();
        });

        document.getElementById('autoNextRound').addEventListener('change', (e) => {
            this.settings.autoNextRound = e.target.checked;
            this.saveData();
        });

        // 网站管理
        document.getElementById('addSiteBtn').addEventListener('click', () => {
            this.addSite();
        });

        document.getElementById('newSiteInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addSite();
            }
        });

        // 预设网站按钮
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sites = e.target.dataset.sites.split(',');
                this.addPresetSites(sites);
            });
        });

        // 数据操作
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('resetDataBtn').addEventListener('click', () => {
            this.resetData();
        });

        // 底部链接
        document.getElementById('helpLink').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://github.com/stayfocus/help' });
        });

        document.getElementById('feedbackLink').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://github.com/stayfocus/feedback' });
        });

        document.getElementById('aboutLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAboutDialog();
        });

        // 网站删除按钮（事件委托）
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) {
                const site = e.target.dataset.site;
                this.removeSite(site);
            }
        });
    }

    // 更新UI
    updateUI() {
        // 更新基本设置
        document.getElementById('autoStart').checked = this.settings.autoStart;
        document.getElementById('showNotifications').checked = this.settings.showNotifications;
        document.getElementById('strictMode').checked = this.settings.strictMode;

        // 更新计时器设置
        document.getElementById('defaultFocusTime').value = this.settings.defaultFocusTime;
        document.getElementById('breakTime').value = this.settings.breakTime;
        document.getElementById('autoNextRound').checked = this.settings.autoNextRound;

        // 更新网站列表
        this.updateSitesList();

        // 更新统计信息
        this.updateStats();
    }

    // 添加网站
    async addSite() {
        const input = document.getElementById('newSiteInput');
        const site = input.value.trim().toLowerCase();
        
        if (!site) return;
        
        // 验证域名格式
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(site)) {
            this.showMessage('请输入有效的域名格式 (例如: example.com)', 'error');
            return;
        }
        
        if (this.blockedSites.includes(site)) {
            this.showMessage('该网站已在屏蔽列表中', 'warning');
            return;
        }
        
        this.blockedSites.push(site);
        await this.saveData();
        this.updateSitesList();
        input.value = '';
        
        this.showMessage(`已添加 ${site} 到屏蔽列表`, 'success');
        
        // 通知背景脚本更新规则
        chrome.runtime.sendMessage({
            action: 'updateBlockedSites',
            sites: this.blockedSites
        });
    }

    // 删除网站
    async removeSite(site) {
        const index = this.blockedSites.indexOf(site);
        if (index > -1) {
            this.blockedSites.splice(index, 1);
            await this.saveData();
            this.updateSitesList();
            
            this.showMessage(`已从屏蔽列表中移除 ${site}`, 'success');
            
            // 通知背景脚本更新规则
            chrome.runtime.sendMessage({
                action: 'updateBlockedSites',
                sites: this.blockedSites
            });
        }
    }

    // 添加预设网站
    async addPresetSites(sites) {
        let addedCount = 0;
        
        sites.forEach(site => {
            if (!this.blockedSites.includes(site)) {
                this.blockedSites.push(site);
                addedCount++;
            }
        });
        
        if (addedCount > 0) {
            await this.saveData();
            this.updateSitesList();
            this.showMessage(`已添加 ${addedCount} 个网站到屏蔽列表`, 'success');
            
            // 通知背景脚本更新规则
            chrome.runtime.sendMessage({
                action: 'updateBlockedSites',
                sites: this.blockedSites
            });
        } else {
            this.showMessage('所有网站都已在屏蔽列表中', 'info');
        }
    }

    // 更新网站列表
    updateSitesList() {
        const sitesList = document.getElementById('sitesList');
        
        if (this.blockedSites.length === 0) {
            sitesList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #6B7280;">
                    <p>暂无屏蔽网站</p>
                    <p style="font-size: 12px; margin-top: 8px;">添加一些网站来开始使用StayFocus</p>
                </div>
            `;
            return;
        }
        
        sitesList.innerHTML = '';
        
        this.blockedSites.forEach(site => {
            const siteItem = document.createElement('div');
            siteItem.className = 'site-item';
            siteItem.innerHTML = `
                <span class="site-url">${site}</span>
                <button class="remove-btn" data-site="${site}" title="删除">×</button>
            `;
            sitesList.appendChild(siteItem);
        });
    }

    // 更新统计信息
    updateStats() {
        document.getElementById('todayFocusTime').textContent = this.formatTime(this.stats.todayFocusTime);
        document.getElementById('weekFocusTime').textContent = this.formatTime(this.stats.weekFocusTime);
        document.getElementById('totalBlocked').textContent = this.stats.totalBlocked.toString();
        document.getElementById('streakDays').textContent = `${this.stats.streakDays} 天`;
    }

    // 格式化时间
    formatTime(minutes) {
        if (minutes === 0) return '0 分钟';
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
        }
        return `${mins} 分钟`;
    }

    // 导出数据
    exportData() {
        const data = {
            settings: this.settings,
            blockedSites: this.blockedSites,
            stats: this.stats,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `stayfocus-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showMessage('数据导出成功', 'success');
    }

    // 重置数据
    async resetData() {
        const confirmed = confirm('确定要重置所有数据吗？此操作不可撤销。');
        if (!confirmed) return;
        
        // 重置为默认值
        this.settings = {
            autoStart: false,
            showNotifications: true,
            strictMode: false,
            defaultFocusTime: 25,
            breakTime: 5,
            autoNextRound: false
        };
        this.blockedSites = ['facebook.com', 'twitter.com', 'youtube.com'];
        this.stats = {
            todayFocusTime: 0,
            weekFocusTime: 0,
            totalBlocked: 0,
            streakDays: 0
        };
        
        await this.saveData();
        this.updateUI();
        
        this.showMessage('所有数据已重置', 'success');
        
        // 通知背景脚本更新规则
        chrome.runtime.sendMessage({
            action: 'updateBlockedSites',
            sites: this.blockedSites
        });
    }

    // 显示关于对话框
    showAboutDialog() {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        dialog.innerHTML = `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 32px;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            ">
                <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
                <h2 style="font-size: 24px; margin-bottom: 8px; color: #1F2937;">StayFocus</h2>
                <p style="color: #6B7280; margin-bottom: 16px;">版本 1.0.0</p>
                <p style="color: #374151; line-height: 1.6; margin-bottom: 24px;">
                    StayFocus 是一个帮助保持专注的浏览器扩展。<br>
                    通过屏蔽干扰网站和番茄钟计时器，<br>
                    更好地专注于重要的工作。
                </p>
                <button id="closeAbout" style="
                    background: #4F46E5;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 12px 24px;
                    font-size: 14px;
                    cursor: pointer;
                ">关闭</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        dialog.querySelector('#closeAbout').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
        
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });
    }

    // 显示消息提示
    showMessage(text, type = 'info') {
        const message = document.createElement('div');
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };
        
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease-out;
        `;
        
        message.textContent = text;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (document.body.contains(message)) {
                    document.body.removeChild(message);
                }
            }, 300);
        }, 3000);
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 当DOM加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
    new StayFocusOptions();
});

