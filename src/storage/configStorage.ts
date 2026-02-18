import * as vscode from 'vscode';
import { ProxyConfig, ProxySwitcherState } from '../types';

const STATE_KEY = 'claudeProxySwitcher.state';

export class ConfigStorage {
  constructor(private globalState: vscode.Memento) {}

  getState(): ProxySwitcherState {
    return this.globalState.get<ProxySwitcherState>(STATE_KEY, {
      activeProxyId: null,
      proxies: []
    });
  }

  async setState(state: ProxySwitcherState): Promise<void> {
    await this.globalState.update(STATE_KEY, state);
  }

  async addProxy(proxy: ProxyConfig): Promise<void> {
    const state = this.getState();
    state.proxies.push(proxy);
    await this.setState(state);
  }

  async deleteProxy(id: string): Promise<void> {
    const state = this.getState();
    state.proxies = state.proxies.filter(p => p.id !== id);
    if (state.activeProxyId === id) {
      state.activeProxyId = null;
    }
    await this.setState(state);
  }

  async setActiveProxy(id: string | null): Promise<void> {
    const state = this.getState();
    state.activeProxyId = id;
    await this.setState(state);
  }

  async updateProxyTestResult(id: string, result: ProxyConfig['lastTestResult']): Promise<void> {
    const state = this.getState();
    const proxy = state.proxies.find(p => p.id === id);
    if (proxy) {
      proxy.lastTestResult = result;
      await this.setState(state);
    }
  }

  getProxy(id: string): ProxyConfig | undefined {
    return this.getState().proxies.find(p => p.id === id);
  }
}
