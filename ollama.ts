import axios from 'axios';

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export class OllamaClient {
  private baseUrl = 'http://localhost:11434/api/chat';
  private model = 'qwen3:14b';

  constructor(modelName?: string) {
    if (modelName) this.model = modelName;
  }

  async chat(messages: Message[]): Promise<any> {
    try {
      const response = await axios.post(this.baseUrl, {
        model: this.model,
        messages: messages,
        stream: false,
        options: {
          temperature: 0,
        }
      });
      return response.data.message;
    } catch (error: any) {
      console.error('[Ollama Error]', error.message);
      throw error;
    }
  }
}
