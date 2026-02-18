import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SecretStorage } from '../storage/secretStorage';

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

interface ClaudeSettings {
  env?: {
    ANTHROPIC_BASE_URL?: string;
    ANTHROPIC_AUTH_TOKEN?: string;
    [key: string]: string | undefined;
  };
  [key: string]: unknown;
}

export class ProxyService {
  constructor(private secretStorage: SecretStorage) {}

  private readSettings(): ClaudeSettings {
    try {
      if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
        const content = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.warn('Failed to read Claude settings:', e);
    }
    return {};
  }

  private writeSettings(settings: ClaudeSettings): void {
    const dir = path.dirname(CLAUDE_SETTINGS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
  }

  async switchProxy(proxyId: string, baseUrl: string): Promise<void> {
    const apiKey = await this.secretStorage.getApiKey(proxyId);
    if (!apiKey) {
      throw new Error('API Key not found for this proxy');
    }

    const settings = this.readSettings();
    if (!settings.env) {
      settings.env = {};
    }

    settings.env.ANTHROPIC_BASE_URL = baseUrl;
    settings.env.ANTHROPIC_AUTH_TOKEN = apiKey;

    this.writeSettings(settings);
  }

  clearProxy(): void {
    const settings = this.readSettings();
    if (settings.env) {
      delete settings.env.ANTHROPIC_BASE_URL;
      delete settings.env.ANTHROPIC_AUTH_TOKEN;
      if (Object.keys(settings.env).length === 0) {
        delete settings.env;
      }
    }
    this.writeSettings(settings);
  }

  getCurrentProxy(): { baseUrl?: string; hasToken: boolean } {
    const settings = this.readSettings();
    return {
      baseUrl: settings.env?.ANTHROPIC_BASE_URL,
      hasToken: !!settings.env?.ANTHROPIC_AUTH_TOKEN
    };
  }
}
