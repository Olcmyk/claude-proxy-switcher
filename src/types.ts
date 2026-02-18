export interface ProxyConfig {
  id: string;
  name: string;
  baseUrl: string;
  createdAt: number;
  lastTestResult?: {
    success: boolean;
    latency?: number;
    error?: string;
    testedAt: number;
  };
}

export interface ProxySwitcherState {
  activeProxyId: string | null;
  proxies: ProxyConfig[];
}

export type WebviewMessage =
  | { type: 'addProxy'; name: string; baseUrl: string; apiKey: string }
  | { type: 'deleteProxy'; id: string }
  | { type: 'switchProxy'; id: string }
  | { type: 'testProxy'; id: string }
  | { type: 'clearProxy' }
  | { type: 'refresh' };

export type ExtensionMessage =
  | { type: 'stateUpdate'; state: ProxySwitcherState }
  | { type: 'testResult'; id: string; result: ProxyConfig['lastTestResult'] }
  | { type: 'openAddForm' }
  | { type: 'testAllProxies' }
  | { type: 'error'; message: string }
  | { type: 'info'; message: string }
  | { type: 'i18n'; translations: Record<string, string> };
