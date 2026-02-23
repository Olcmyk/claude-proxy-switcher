import * as vscode from 'vscode';
import { ProxySwitcherState, WebviewMessage, ExtensionMessage } from '../types';
import { getLanguage, t, translations } from '../i18n';

export class ProxyManagerPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'claudeProxySwitcher.proxyManager';
  private _view?: vscode.WebviewView;
  private _onMessage: (message: WebviewMessage) => void = () => {};

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public setMessageHandler(handler: (message: WebviewMessage) => void) {
    this._onMessage = handler;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    // Register message handler BEFORE setting HTML to avoid race condition
    // where the webview sends 'refresh' before the handler is attached
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      this._onMessage(message);
    });

    webviewView.webview.html = this._getHtmlContent();

    // Send translation data to webview (VS Code queues this until webview is ready)
    const lang = getLanguage();
    const i18nData = translations[lang];
    webviewView.webview.postMessage({ type: 'i18n', translations: i18nData });

    // Re-send state when the view becomes visible again
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._onMessage({ type: 'refresh' });
      }
    });
  }

  public postMessage(message: ExtensionMessage) {
    this._view?.webview.postMessage(message);
  }

  public updateState(state: ProxySwitcherState) {
    this.postMessage({ type: 'stateUpdate', state });
  }

  private _getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Proxy Switcher</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 0 12px 12px 12px;
    }
    .header { display: none; }
    .header-actions { display: flex; gap: 4px; }
    .icon-btn {
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-btn:hover { background: var(--vscode-toolbar-hoverBackground); }
    .icon-btn svg { width: 16px; height: 16px; }
    .proxy-list { display: flex; flex-direction: column; gap: 8px; }
    .proxy-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 10px;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .proxy-card:hover { border-color: var(--vscode-focusBorder); }
    .proxy-card.active { border-color: var(--vscode-focusBorder); background: var(--vscode-list-activeSelectionBackground); }
    .proxy-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .proxy-name { font-weight: 600; font-size: 13px; }
    .active-badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
    }
    .proxy-url {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      margin-bottom: 8px;
      word-break: break-all;
    }
    .proxy-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .test-btn {
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
    }
    .test-btn:hover { background: var(--vscode-toolbar-hoverBackground); color: var(--vscode-foreground); }
    .test-btn svg { width: 14px; height: 14px; }
    .test-btn.success { color: var(--vscode-testing-iconPassed); }
    .test-btn.error { color: var(--vscode-testing-iconFailed); }
    .test-btn.loading svg { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .delete-btn {
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      padding: 4px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      opacity: 0.6;
    }
    .delete-btn:hover { background: var(--vscode-toolbar-hoverBackground); opacity: 1; }
    .delete-btn svg { width: 14px; height: 14px; }
    .add-form {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 12px;
      display: none;
    }
    .add-form.show { display: block; }
    .form-group { margin-bottom: 10px; }
    .form-group label {
      display: block;
      font-size: 11px;
      margin-bottom: 4px;
      color: var(--vscode-descriptionForeground);
    }
    .form-group input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 3px;
      font-size: 12px;
    }
    .form-group input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
    .form-actions { display: flex; gap: 8px; align-items: center; }
    .form-actions-right { display: flex; gap: 8px; margin-left: auto; }
    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .empty-state {
      text-align: center;
      padding: 24px;
      color: var(--vscode-descriptionForeground);
    }
    .empty-state svg { width: 20px; height: 20px; margin-bottom: 8px; opacity: 0.5; }
    .clear-btn {
      margin-top: 12px;
      width: 100%;
      padding: 8px;
      background: transparent;
      border: 1px dashed var(--vscode-panel-border);
      color: var(--vscode-descriptionForeground);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .clear-btn:hover {
      border-color: var(--vscode-focusBorder);
      color: var(--vscode-foreground);
    }
    .clipboard-btn {
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 3px;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .clipboard-btn:hover {
      background: var(--vscode-toolbar-hoverBackground);
      color: var(--vscode-foreground);
    }
    .clipboard-btn svg { width: 14px; height: 14px; }
    .toast {
      position: fixed;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--vscode-notifications-background);
      color: var(--vscode-notifications-foreground);
      border: 1px solid var(--vscode-panel-border);
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 11px;
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 100;
      pointer-events: none;
      white-space: nowrap;
    }
    .toast.show { opacity: 1; }
    .toast.success { border-color: var(--vscode-testing-iconPassed); }
    .toast.warning { border-color: var(--vscode-testing-iconFailed); }
  </style>
</head>
<body>
  <div class="header">
  </div>

  <div id="addForm" class="add-form">
    <div class="form-group">
      <label id="labelName"></label>
      <input type="text" id="proxyName" placeholder="">
    </div>
    <div class="form-group">
      <label id="labelUrl"></label>
      <input type="text" id="proxyUrl" placeholder="https://api.example.com">
    </div>
    <div class="form-group">
      <label id="labelKey"></label>
      <input type="password" id="proxyKey" placeholder="sk-xxx">
    </div>
    <div class="form-actions">
      <button class="clipboard-btn" onclick="readClipboard()" id="clipboardBtn">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="1" width="6" height="2" rx="0.5"/><path d="M4 3h8v11H4z"/><path d="M6 7h4M6 9h4"/></svg>
        <span id="clipboardBtnText"></span>
      </button>
      <div class="form-actions-right">
        <button class="btn btn-secondary" onclick="toggleAddForm()" id="btnCancel"></button>
        <button class="btn btn-primary" onclick="addProxy()" id="btnAdd"></button>
      </div>
    </div>
  </div>

  <div id="proxyList" class="proxy-list"></div>

  <button id="clearBtn" class="clear-btn" style="display:none" onclick="clearProxy()"></button>

  <div id="toast" class="toast"></div>

  <script>
    const vscode = acquireVsCodeApi();
    let state = { activeProxyId: null, proxies: [] };
    let testingIds = new Set();
    let showTestResults = localStorage.getItem('showTestResults') === 'true';
    let i18n = {};

    const icons = {
      bolt: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2L4 9h4l-1 5 5-7H8l1-5z"/></svg>',
      spinner: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2a6 6 0 1 1-6 6"/></svg>',
      trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12M6.5 7v5M9.5 7v5M3 4l1 10c0 0.5 0.5 1 1 1h6c0.5 0 1-0.5 1-1l1-10M6 4V2.5c0-0.3 0.2-0.5 0.5-0.5h3c0.3 0 0.5 0.2 0.5 0.5V4"/></svg>',
      plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>'
    };

    function initializeUI() {
      document.getElementById('labelName').textContent = i18n.nameLabel;
      document.getElementById('proxyName').placeholder = i18n.namePlaceholder;
      document.getElementById('labelUrl').textContent = i18n.urlLabel;
      document.getElementById('labelKey').textContent = i18n.keyLabel;
      document.getElementById('btnCancel').textContent = i18n.cancelButton;
      document.getElementById('btnAdd').textContent = i18n.addButton;
      document.getElementById('clearBtn').textContent = i18n.clearButton;
      document.getElementById('clipboardBtnText').textContent = i18n.clipboardButton;
      document.title = i18n.pageTitle;
    }

    function toggleAddForm() {
      document.getElementById('addForm').classList.toggle('show');
    }

    function generateDefaultName() {
      const baseName = i18n.defaultProxyName || '中转平台';
      const existingNames = new Set(state.proxies.map(p => p.name));
      if (!existingNames.has(baseName)) {
        return baseName;
      }
      let index = 2;
      while (existingNames.has(baseName + index)) {
        index++;
      }
      return baseName + index;
    }

    function addProxy() {
      let name = document.getElementById('proxyName').value.trim();
      const baseUrl = document.getElementById('proxyUrl').value.trim();
      const apiKey = document.getElementById('proxyKey').value.trim();

      if (!baseUrl || !apiKey) {
        return;
      }

      if (!name) {
        name = generateDefaultName();
      }

      vscode.postMessage({ type: 'addProxy', name, baseUrl, apiKey });
      document.getElementById('proxyName').value = '';
      document.getElementById('proxyUrl').value = '';
      document.getElementById('proxyKey').value = '';
      toggleAddForm();
    }

    function deleteProxy(e, id) {
      e.stopPropagation();
      vscode.postMessage({ type: 'deleteProxy', id });
    }

    function switchProxy(id) {
      if (state.activeProxyId !== id) {
        vscode.postMessage({ type: 'switchProxy', id });
      }
    }

    function testProxy(e, id) {
      e.stopPropagation();
      showTestResults = true;
      localStorage.setItem('showTestResults', 'true');
      testingIds.add(id);
      renderProxies();
      vscode.postMessage({ type: 'testProxy', id });
    }

    function testAllProxies() {
      showTestResults = true;
      localStorage.setItem('showTestResults', 'true');
      state.proxies.forEach(proxy => {
        testingIds.add(proxy.id);
        vscode.postMessage({ type: 'testProxy', id: proxy.id });
      });
      renderProxies();
    }

    function clearProxy() {
      vscode.postMessage({ type: 'clearProxy' });
    }

    function renderProxies() {
      const list = document.getElementById('proxyList');
      const clearBtn = document.getElementById('clearBtn');

      if (state.proxies.length === 0) {
        list.innerHTML = '<div class="empty-state">' + icons.plus + '<br>' + (i18n.emptyState || '').replace('\\n', '<br>') + '</div>';
        clearBtn.style.display = 'none';
        return;
      }

      clearBtn.style.display = state.activeProxyId ? 'block' : 'none';

      list.innerHTML = state.proxies.map(proxy => {
        const isActive = proxy.id === state.activeProxyId;
        const isTesting = testingIds.has(proxy.id);
        const test = proxy.lastTestResult;

        let testBtnClass = 'test-btn';
        let testBtnContent = icons.bolt;
        let testBtnTitle = i18n.testConnectionTitle;

        if (isTesting) {
          testBtnClass += ' loading';
          testBtnContent = icons.spinner;
        } else if (test && showTestResults) {
          if (test.success) {
            testBtnClass += ' success';
            testBtnContent = (test.latency || 0) + 'ms';
          } else {
            testBtnClass += ' error';
            testBtnContent = 'ERR';
          }
        }

        return '<div class="proxy-card' + (isActive ? ' active' : '') + '" onclick="switchProxy(\\'' + proxy.id + '\\')">' +
          '<div class="proxy-header">' +
            '<span class="proxy-name">' + escapeHtml(proxy.name) + '</span>' +
            (isActive ? '<span class="active-badge">' + i18n.activeBadge + '</span>' : '') +
          '</div>' +
          '<div class="proxy-url">' + escapeHtml(proxy.baseUrl) + '</div>' +
          '<div class="proxy-footer">' +
            '<button class="' + testBtnClass + '" onclick="testProxy(event, \\'' + proxy.id + '\\')" title="' + testBtnTitle + '">' + testBtnContent + '</button>' +
            '<button class="delete-btn" onclick="deleteProxy(event, \\'' + proxy.id + '\\')" title="' + i18n.deleteTitle + '">' + icons.trash + '</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function showToast(message, type) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'toast ' + (type || '') + ' show';
      clearTimeout(showToast._timer);
      showToast._timer = setTimeout(() => { toast.classList.remove('show'); }, 2500);
    }
    showToast._timer = null;

    function parseClipboardForProxy(text) {
      const result = { url: null, key: null };
      if (!text) return result;

      // Extract ANTHROPIC_BASE_URL from various formats:
      // export ANTHROPIC_BASE_URL="https://..." / echo 'export ANTHROPIC_BASE_URL="https://..."' >> ...
      const urlPatterns = [
        /ANTHROPIC_BASE_URL\\s*=\\s*"([^"]+)"/,
        /ANTHROPIC_BASE_URL\\s*=\\s*'([^']+)'/,
        /ANTHROPIC_BASE_URL\\s*=\\s*([^\\s"';&]+)/,
      ];
      for (const pattern of urlPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          result.url = match[1];
          break;
        }
      }

      // Extract ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY
      const keyPatterns = [
        /ANTHROPIC_(?:AUTH_TOKEN|API_KEY)\\s*=\\s*"([^"]+)"/,
        /ANTHROPIC_(?:AUTH_TOKEN|API_KEY)\\s*=\\s*'([^']+)'/,
        /ANTHROPIC_(?:AUTH_TOKEN|API_KEY)\\s*=\\s*([^\\s"';&]+)/,
      ];
      for (const pattern of keyPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          result.key = match[1];
          break;
        }
      }

      // Fallback: look for sk- pattern as API key
      if (!result.key) {
        const skMatch = text.match(/\\b(sk-[A-Za-z0-9_-]{16,})\\b/);
        if (skMatch) {
          result.key = skMatch[1];
        }
      }

      // Fallback: look for standalone https URL (not common domains like github, google, etc.)
      if (!result.url) {
        const urls = text.match(/https?:\\/\\/[^\\s"'<>\\]\\)]+/g);
        if (urls) {
          const candidate = urls.find(u => !u.includes('github.com') && !u.includes('google.com'));
          if (candidate) {
            result.url = candidate.replace(/[\\/]+$/, '');
          }
        }
      }

      return result;
    }

    function readClipboard() {
      vscode.postMessage({ type: 'readClipboard' });
    }

    function handleClipboardContent(text) {
      const parsed = parseClipboardForProxy(text);
      const hasUrl = !!parsed.url;
      const hasKey = !!parsed.key;

      if (!hasUrl && !hasKey) {
        showToast(i18n.clipboardNoData, 'warning');
        return;
      }

      // Open form if not already open
      const form = document.getElementById('addForm');
      if (!form.classList.contains('show')) {
        form.classList.add('show');
      }

      if (hasUrl) {
        document.getElementById('proxyUrl').value = parsed.url;
      }
      if (hasKey) {
        document.getElementById('proxyKey').value = parsed.key;
      }

      if (hasUrl && hasKey) {
        showToast(i18n.clipboardFoundBoth, 'success');
      } else if (hasUrl) {
        showToast(i18n.clipboardFoundUrl, 'success');
        document.getElementById('proxyKey').focus();
      } else {
        showToast(i18n.clipboardFoundKey, 'success');
        document.getElementById('proxyUrl').focus();
      }
    }

    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.type) {
        case 'i18n':
          i18n = message.translations;
          initializeUI();
          break;
        case 'stateUpdate':
          state = message.state;
          if (!showTestResults) {
            state.proxies.forEach(proxy => {
              proxy.lastTestResult = undefined;
            });
          }
          renderProxies();
          break;
        case 'testResult':
          testingIds.delete(message.id);
          const proxy = state.proxies.find(p => p.id === message.id);
          if (proxy) {
            proxy.lastTestResult = message.result;
          }
          renderProxies();
          break;
        case 'openAddForm':
          document.getElementById('addForm').classList.add('show');
          document.getElementById('proxyName').focus();
          break;
        case 'testAllProxies':
          showTestResults = true;
          localStorage.setItem('showTestResults', 'true');
          state.proxies.forEach(proxy => {
            testingIds.add(proxy.id);
            vscode.postMessage({ type: 'testProxy', id: proxy.id });
          });
          renderProxies();
          break;
        case 'clipboardContent':
          handleClipboardContent(message.text);
          break;
      }
    });

    vscode.postMessage({ type: 'refresh' });
    renderProxies();
  </script>
</body>
</html>`;
  }
}
