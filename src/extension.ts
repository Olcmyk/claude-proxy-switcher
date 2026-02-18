import * as vscode from 'vscode';
import { ConfigStorage } from './storage/configStorage';
import { SecretStorage } from './storage/secretStorage';
import { ProxyService } from './services/proxyService';
import { ApiTestService } from './services/apiTestService';
import { ProxyManagerPanel } from './webview/ProxyManagerPanel';
import { WebviewMessage, ProxyConfig } from './types';
import { getLanguage, t } from './i18n';

let statusBarItem: vscode.StatusBarItem;

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function activate(context: vscode.ExtensionContext) {
  const secretStorage = new SecretStorage(context.secrets);
  const configStorage = new ConfigStorage(context.globalState);
  const proxyService = new ProxyService(secretStorage);
  const apiTestService = new ApiTestService(secretStorage);

  const panel = new ProxyManagerPanel(context.extensionUri);

  const syncActiveProxy = () => {
    const state = configStorage.getState();
    const current = proxyService.getCurrentProxy();

    if (current.baseUrl && current.hasToken) {
      const matchingProxy = state.proxies.find(p => p.baseUrl === current.baseUrl);
      if (matchingProxy && state.activeProxyId !== matchingProxy.id) {
        configStorage.setActiveProxy(matchingProxy.id);
      } else if (!matchingProxy && state.activeProxyId !== null) {
        configStorage.setActiveProxy(null);
      }
    } else if (state.activeProxyId !== null) {
      configStorage.setActiveProxy(null);
    }
  };

  const updateStatusBar = () => {
    const state = configStorage.getState();
    const lang = getLanguage();
    if (state.activeProxyId) {
      const proxy = state.proxies.find(p => p.id === state.activeProxyId);
      statusBarItem.text = `$(cloud) ${proxy?.name || t('statusBarProxy', lang)}`;
      statusBarItem.tooltip = t('statusBarTooltip', lang, { name: proxy?.name || '', url: proxy?.baseUrl || '' });
    } else {
      statusBarItem.text = `$(cloud) ${t('statusBarNoProxy', lang)}`;
      statusBarItem.tooltip = t('statusBarTooltipEmpty', lang);
    }
  };

  const sendStateUpdate = () => {
    syncActiveProxy();
    panel.updateState(configStorage.getState());
    updateStatusBar();
  };

  panel.setMessageHandler(async (message: WebviewMessage) => {
    switch (message.type) {
      case 'addProxy': {
        const proxy: ProxyConfig = {
          id: generateId(),
          name: message.name,
          baseUrl: message.baseUrl.replace(/\/$/, ''),
          createdAt: Date.now()
        };
        await secretStorage.setApiKey(proxy.id, message.apiKey);
        await configStorage.addProxy(proxy);
        vscode.window.showInformationMessage(t('addProxySuccess', undefined, { name: proxy.name }));
        sendStateUpdate();
        break;
      }

      case 'deleteProxy': {
        const proxy = configStorage.getProxy(message.id);
        const confirmText = t('deleteConfirmYes');
        const result = await vscode.window.showWarningMessage(
          t('deleteConfirm', undefined, { name: proxy?.name || '' }),
          { modal: true },
          confirmText
        );
        if (result !== confirmText) {
          break;
        }
        await secretStorage.deleteApiKey(message.id);
        await configStorage.deleteProxy(message.id);
        if (configStorage.getState().activeProxyId === null) {
          proxyService.clearProxy();
        }
        vscode.window.showInformationMessage(t('deleteProxySuccess', undefined, { name: proxy?.name || '' }));
        sendStateUpdate();
        break;
      }

      case 'switchProxy': {
        const proxy = configStorage.getProxy(message.id);
        if (proxy) {
          try {
            await proxyService.switchProxy(message.id, proxy.baseUrl);
            await configStorage.setActiveProxy(message.id);
            vscode.window.showInformationMessage(t('switchProxySuccess', undefined, { name: proxy.name }));
            sendStateUpdate();
          } catch (e: unknown) {
            const error = e as Error;
            vscode.window.showErrorMessage(t('switchProxyFailed', undefined, { error: error.message }));
          }
        }
        break;
      }

      case 'testProxy': {
        const proxy = configStorage.getProxy(message.id);
        if (proxy) {
          const lang = getLanguage();
          vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: t('testProxyTitle', lang, { name: proxy.name }) },
            async () => {
              const result = await apiTestService.testConnection(message.id, proxy.baseUrl);
              await configStorage.updateProxyTestResult(message.id, result);
              panel.postMessage({ type: 'testResult', id: message.id, result });
              if (result.success) {
                vscode.window.showInformationMessage(t('testProxySuccess', lang, { name: proxy.name, latency: result.latency || 0 }));
              } else {
                vscode.window.showWarningMessage(`${proxy.name}: ${result.error}`);
              }
            }
          );
        }
        break;
      }

      case 'clearProxy': {
        proxyService.clearProxy();
        await configStorage.setActiveProxy(null);
        vscode.window.showInformationMessage(t('clearProxySuccess'));
        sendStateUpdate();
        break;
      }

      case 'readClipboard': {
        const text = await vscode.env.clipboard.readText();
        panel.postMessage({ type: 'clipboardContent', text: text || '' });
        break;
      }

      case 'refresh': {
        sendStateUpdate();
        break;
      }
    }
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ProxyManagerPanel.viewType, panel, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  statusBarItem.command = 'claudeProxySwitcher.openPanel';
  context.subscriptions.push(statusBarItem);
  statusBarItem.show();

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeProxySwitcher.openPanel', () => {
      vscode.commands.executeCommand('claudeProxySwitcher.proxyManager.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeProxySwitcher.addProxy', () => {
      vscode.commands.executeCommand('claudeProxySwitcher.proxyManager.focus');
      panel.postMessage({ type: 'openAddForm' });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeProxySwitcher.testAllProxies', () => {
      panel.postMessage({ type: 'testAllProxies' });
    })
  );

  syncActiveProxy();
  updateStatusBar();

  setTimeout(() => sendStateUpdate(), 500);
}

export function deactivate() {}
