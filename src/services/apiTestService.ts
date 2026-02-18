import { SecretStorage } from '../storage/secretStorage';

export interface TestResult {
  success: boolean;
  latency?: number;
  error?: string;
  testedAt: number;
}

export class ApiTestService {
  constructor(private secretStorage: SecretStorage) {}

  async testConnection(proxyId: string, baseUrl: string): Promise<TestResult> {
    const apiKey = await this.secretStorage.getApiKey(proxyId);
    if (!apiKey) {
      return {
        success: false,
        error: 'API Key not found',
        testedAt: Date.now()
      };
    }

    const startTime = Date.now();

    try {
      const url = baseUrl.replace(/\/$/, '') + '/v1/messages';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        })
      });

      const latency = Date.now() - startTime;

      if (response.ok || response.status === 400) {
        return {
          success: true,
          latency,
          testedAt: Date.now()
        };
      }

      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // ignore parse error
      }

      return {
        success: false,
        latency,
        error: errorMessage,
        testedAt: Date.now()
      };
    } catch (e: unknown) {
      const error = e as Error;
      return {
        success: false,
        error: error.message || 'Connection failed',
        testedAt: Date.now()
      };
    }
  }
}
