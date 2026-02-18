export type Language = 'en' | 'zh';

export const translations = {
  en: {
    // Status bar
    statusBarProxy: 'Proxy',
    statusBarNoProxy: 'No Proxy',
    statusBarTooltip: 'Current Proxy: {name}\n{url}',
    statusBarTooltipEmpty: 'Click to manage Claude Proxy Switcher',

    // Messages
    addProxySuccess: 'Added Proxy: {name}',
    deleteProxySuccess: 'Deleted Proxy: {name}',
    switchProxySuccess: 'Switched to Proxy: {name}',
    switchProxyFailed: 'Switch failed: {error}',
    testProxyTitle: 'Test Connection: {name}',
    testProxySuccess: '{name}: Connection successful ({latency}ms)',
    clearProxySuccess: 'Proxy configuration cleared',

    // Form
    nameLabel: 'Name',
    namePlaceholder: 'e.g.: Company A',
    urlLabel: 'API Base URL',
    urlPlaceholder: 'https://api.example.com',
    keyLabel: 'API Key',
    keyPlaceholder: 'sk-xxx',
    cancelButton: 'Cancel',
    addButton: 'Add',
    clearButton: 'Clear current proxy configuration',

    // UI
    emptyState: 'No proxy configured\nClick + to add',
    activeBadge: 'In Use',
    testConnectionTitle: 'Test Connection',
    deleteTitle: 'Delete',
    pageTitle: 'Claude Proxy Switcher Configuration',

    // Clipboard
    clipboardButton: 'Read Clipboard',
    clipboardFoundBoth: 'URL and API Key filled from clipboard',
    clipboardFoundUrl: 'URL filled from clipboard',
    clipboardFoundKey: 'API Key filled from clipboard',
    clipboardNoData: 'No proxy data found in clipboard',
  },
  zh: {
    // 状态栏
    statusBarProxy: '代理',
    statusBarNoProxy: '无代理',
    statusBarTooltip: '当前代理: {name}\n{url}',
    statusBarTooltipEmpty: '点击管理 Claude Proxy Switcher',

    // 消息
    addProxySuccess: '已添加代理: {name}',
    deleteProxySuccess: '已删除代理: {name}',
    switchProxySuccess: '已切换到代理: {name}',
    switchProxyFailed: '切换失败: {error}',
    testProxyTitle: '测试连接: {name}',
    testProxySuccess: '{name}: 连接成功 ({latency}ms)',
    clearProxySuccess: '已清除代理配置',

    // 表单
    nameLabel: '名称',
    namePlaceholder: '例如：公司A',
    urlLabel: 'API Base URL',
    urlPlaceholder: 'https://api.example.com',
    keyLabel: 'API Key',
    keyPlaceholder: 'sk-xxx',
    cancelButton: '取消',
    addButton: '添加',
    clearButton: '清除当前代理配置',

    // UI
    emptyState: '暂无代理配置\n点击 + 添加',
    activeBadge: '当前使用',
    testConnectionTitle: '测试连接',
    deleteTitle: '删除',
    pageTitle: 'Claude Proxy Switcher 配置',

    // 剪贴板
    clipboardButton: '读取剪贴板',
    clipboardFoundBoth: '已从剪贴板填入 URL 和 API Key',
    clipboardFoundUrl: '已从剪贴板填入 URL',
    clipboardFoundKey: '已从剪贴板填入 API Key',
    clipboardNoData: '剪贴板中未找到代理数据',
  },
};

export function getLanguage(): Language {
  // 获取 VS Code 的语言设置
  const language = typeof process !== 'undefined' ? process.env.VSCODE_NLS_CONFIG : undefined;

  if (language) {
    try {
      const config = JSON.parse(language);
      const lang = config.locale as string;
      if (lang.startsWith('zh')) {
        return 'zh';
      }
    } catch {
      // ignore
    }
  }

  return 'en';
}

export function t(key: keyof typeof translations.en, lang?: Language, replacements?: Record<string, string | number>): string {
  const currentLang = lang || getLanguage();
  const text = translations[currentLang][key] || translations.en[key];

  if (!replacements) {
    return text;
  }

  return Object.entries(replacements).reduce((str, [key, value]) => {
    return str.replace(`{${key}}`, String(value));
  }, text);
}
