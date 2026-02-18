import * as vscode from 'vscode';
import { ConfigStorage } from './storage/configStorage';
import { SecretStorage } from './storage/secretStorage';
import { ProxyService } from './services/proxyService';
import { ApiTestService } from './services/apiTestService';
import { ProxyManagerPanel } from './webview/ProxyManagerPanel';
import { WebviewMessage, ProxyConfig } from './types';

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
    if (state.activeProxyId) {
      const proxy = state.proxies.find(p => p.id === state.activeProxyId);
      statusBarItem.text = `$(cloud) ${proxy?.name || '代理'}`;
      statusBarItem.tooltip = `当前代理: ${proxy?.name}\n${proxy?.baseUrl}`;
    } else {
      statusBarItem.text = '$(cloud) 无代理';
      statusBarItem.tooltip = '点击管理 Claude 代理';
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
        vscode.window.showInformationMessage(`已添加代理: ${proxy.name}`);
        sendStateUpdate();
        break;
      }

      case 'deleteProxy': {
        const proxy = configStorage.getProxy(message.id);
        await secretStorage.deleteApiKey(message.id);
        await configStorage.deleteProxy(message.id);
        if (configStorage.getState().activeProxyId === null) {
          proxyService.clearProxy();
        }
        vscode.window.showInformationMessage(`已删除代理: ${proxy?.name}`);
        sendStateUpdate();
        break;
      }

      case 'switchProxy': {
        const proxy = configStorage.getProxy(message.id);
        if (proxy) {
          try {
            await proxyService.switchProxy(message.id, proxy.baseUrl);
            await configStorage.setActiveProxy(message.id);
            vscode.window.showInformationMessage(`已切换到代理: ${proxy.name}`);
            sendStateUpdate();
          } catch (e: unknown) {
            const error = e as Error;
            vscode.window.showErrorMessage(`切换失败: ${error.message}`);
          }
        }
        break;
      }

      case 'testProxy': {
        const proxy = configStorage.getProxy(message.id);
        if (proxy) {
          vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: `测试连接: ${proxy.name}` },
            async () => {
              const result = await apiTestService.testConnection(message.id, proxy.baseUrl);
              await configStorage.updateProxyTestResult(message.id, result);
              panel.postMessage({ type: 'testResult', id: message.id, result });
              if (result.success) {
                vscode.window.showInformationMessage(`${proxy.name}: 连接成功 (${result.latency}ms)`);
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
        vscode.window.showInformationMessage('已清除代理配置');
        sendStateUpdate();
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
