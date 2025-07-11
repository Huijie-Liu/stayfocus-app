# StayFocus 安装指南

## 快速安装步骤

### 1. 下载扩展文件
确保已经获得了完整的 StayFocus 扩展文件夹，包含以下文件：

```
stayfocus-app/
├── manifest.json
├── popup.html
├── options.html
├── background.js
├── content.js
├── rules.json
├── css/
│   ├── popup.css
│   └── options.css
├── js/
│   ├── popup.js
│   └── options.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### 2. 打开Chrome扩展管理页面
1. 打开Chrome浏览器
2. 在地址栏输入：`chrome://extensions/`
3. 按回车键进入扩展管理页面

### 3. 启用开发者模式
在扩展管理页面的右上角，找到"开发者模式"开关并启用它。

### 4. 加载扩展
1. 点击页面左上角的"加载已解压的扩展程序"按钮
2. 在弹出的文件选择对话框中，选择 `stayfocus-app` 文件夹
3. 点击"选择文件夹"按钮

### 5. 确认安装
安装成功后，将在扩展管理页面看到 StayFocus 扩展，并且浏览器工具栏会出现 StayFocus 图标。

## 开始使用

### 首次设置
1. 点击工具栏中的 StayFocus 图标
2. 在弹出的窗口中，可以：
   - 开启/关闭专注模式
   - 添加要屏蔽的网站
   - 开始专注计时器
   - 查看今日统计

### 高级设置
1. 在弹窗底部点击"设置"按钮
2. 在设置页面中配置：
   - 基本设置（自动启动、通知等）
   - 计时器设置（专注时间、休息时间）
   - 网站管理（批量添加、预设模板）
   - 数据统计查看

## 故障排除

### 扩展无法加载
- 确保文件夹结构完整
- 检查 manifest.json 文件是否存在
- 确保开发者模式已启用

### 网站屏蔽不生效
- 检查专注模式是否已启用
- 确认网站域名格式正确（如：example.com）
- 尝试刷新被屏蔽的网页

### 计时器不工作
- 检查浏览器是否允许通知
- 确保扩展有足够的权限
- 尝试重新启动浏览器

## 卸载扩展

卸载 StayFocus：
1. 进入 `chrome://extensions/`
2. 找到 StayFocus 扩展
3. 点击"移除"按钮
4. 确认卸载

## 技术支持

如果在安装或使用过程中遇到问题，请检查：
1. Chrome 浏览器版本是否为 88 或更高
2. 是否有足够的系统权限
3. 防火墙或安全软件是否阻止了扩展运行

---

专注工作，提升效率！

