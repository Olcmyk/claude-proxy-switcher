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

    webviewView.webview.html = this._getHtmlContent();

    // Send translation data to webview
    const lang = getLanguage();
    const i18nData = translations[lang];
    webviewView.webview.postMessage({ type: 'i18n', translations: i18nData });

    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      this._onMessage(message);
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
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; }
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
      <button class="btn btn-secondary" onclick="toggleAddForm()" id="btnCancel"></button>
      <button class="btn btn-primary" onclick="addProxy()" id="btnAdd"></button>
    </div>
  </div>

  <div id="proxyList" class="proxy-list"></div>

  <button id="clearBtn" class="clear-btn" style="display:none" onclick="clearProxy()"></button>

  <script>
    const vscode = acquireVsCodeApi();
    let state = { activeProxyId: null, proxies: [] };
    let testingIds = new Set();
    let showTestResults = localStorage.getItem('showTestResults') === 'true';
    let i18n = {};

    const icons = {
      bolt: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2L4 9h4l-1 5 5-7H8l1-5z"/></svg>',
      spinner: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2a6 6 0 1 1-6 6"/></svg>',
      trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4h10M6 4V3h4v1M5 4v9h6V4"/></svg>',
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
      document.title = i18n.pageTitle;
    }

    function toggleAddForm() {
      document.getElementById('addForm').classList.toggle('show');
    }

    function addProxy() {
      const name = document.getElementById('proxyName').value.trim();
      const baseUrl = document.getElementById('proxyUrl').value.trim();
      const apiKey = document.getElementById('proxyKey').value.trim();

      if (!name || !baseUrl || !apiKey) {
        return;
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
        list.innerHTML = '<div class="empty-state">' + icons.plus + '<br>' + i18n.emptyState.replace('\\n', '<br>') + '</div>';
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
      }
    });

    renderProxies();
    vscode.postMessage({ type: 'refresh' });
  </script>
</body>
</html>`;
  }
}
