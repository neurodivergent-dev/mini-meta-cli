import axios from 'axios';

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export class OllamaClient {
  private baseUrl = 'http://localhost:11434/api/chat';
  private model = 'qwen2.5-coder:7B';
  private maxRetries = 3;

  constructor(modelName?: string) {
    if (modelName) this.model = modelName;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async chat(messages: Message[]): Promise<any> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(this.baseUrl, {
          model: this.model,
          messages: messages,
          stream: false,
          think: false,
          options: { temperature: 0.1, num_ctx: 4096 }
        }, { timeout: 180000 });
        return response.data.message;
      } catch (error: any) {
        lastError = error.response?.data?.error || error.message;
        const isRetryable = lastError === 'EOF' || lastError.includes('500') || lastError.includes('timeout');
        
        if (isRetryable && attempt < this.maxRetries) {
          console.log(`\x1b[33m[Ollama] Retry ${attempt}/${this.maxRetries} (${lastError})...\x1b[0m`);
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
