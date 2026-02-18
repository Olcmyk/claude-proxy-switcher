import * as vscode from 'vscode';

const KEY_PREFIX = 'claudeProxySwitcher.apiKey.';

export class SecretStorage {
  constructor(private secrets: vscode.SecretStorage) {}

  async getApiKey(proxyId: string): Promise<string | undefined> {
    return this.secrets.get(KEY_PREFIX + proxyId);
  }

  async setApiKey(proxyId: string, apiKey: string): Promise<void> {
    await this.secrets.store(KEY_PREFIX + proxyId, apiKey);
  }

  async deleteApiKey(proxyId: string): Promise<void> {
    await this.secrets.delete(KEY_PREFIX + proxyId);
  }
}
