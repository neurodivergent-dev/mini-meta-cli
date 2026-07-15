import type { Message } from './types';

export type { Message };

export class OllamaClient {
  private baseUrl =
    process.env.OLLAMA_HOST?.replace(/\/$/, '') || 'http://localhost:11434';
  private model = process.env.MINI_META_MODEL || 'gemma4:26b';
  private maxRetries = 3;

  constructor(modelName?: string) {
    if (modelName) this.model = modelName;
  }

  get modelName(): string {
    return this.model;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async chat(messages: Message[]): Promise<{ role: string; content: string }> {
    let lastError = '';
    const url = `${this.baseUrl}/api/chat`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 180_000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            messages,
            stream: false,
            think: false,
            options: { temperature: 0.1, num_ctx: 8192 },
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(
            body || `HTTP ${response.status} ${response.statusText}`,
          );
        }

        const data = (await response.json()) as {
          message?: { role: string; content: string };
          error?: string;
        };

        if (data.error) throw new Error(data.error);
        if (!data.message) throw new Error('Boş Ollama yanıtı');
        return data.message;
      } catch (error: unknown) {
        const e = error as { name?: string; message?: string };
        lastError =
          e.name === 'AbortError'
            ? 'timeout'
            : e.message || String(error);

        const isRetryable =
          lastError === 'EOF' ||
          lastError.includes('500') ||
          lastError.includes('timeout') ||
          lastError.includes('ECONNREFUSED') ||
          lastError.includes('fetch failed');

        if (isRetryable && attempt < this.maxRetries) {
          console.log(
            `\x1b[33m[Ollama] Retry ${attempt}/${this.maxRetries} (${lastError})...\x1b[0m`,
          );
          await this.sleep(2000 * attempt);
          continue;
        }

        console.error('[Ollama Error]', lastError);
        throw new Error(lastError);
      }
    }

    throw new Error(lastError);
  }
}
