import { OllamaClient, Message } from './ollama';
import { tools } from './tools';

export class MiniTenguEngine {
  private client: OllamaClient;
  private messages: Message[] = [];

  constructor(model?: string) {
    this.client = new OllamaClient(model);
    this.messages.push({
      role: 'system',
      content: `Sen Mini-Meta adında, Claude Code genetiğine sahip, yerel bir 'EYLEM AJANI'sın.
      Şu an WINDOWS işletim sistemindesin. 

      ARAÇ KULLANIM PROTOKOLÜ:
      Bir araç kullanman gerektiğinde SADECE şu formatı kullan:
      <tool_call name="araç_adı" path="opsiyonel_dosya_yolu">
      parametre_değeri_veya_içerik
      </tool_call>
      
      ÖNEMLİ: 'replace_file_content' için şu formatı kullan:
      <tool_call name="replace_file_content" path="dosya.html">
      SEARCH_BLOCK
      eski_metin
      REPLACE_BLOCK
      yeni_metin
      </tool_call>

      MEVCUT ARAÇLAR:
      ${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}
      
      STRATEJİ: Önce bilgiyi topla (fetch/search), sonra işle, en son kaydet (write_file).`
    });
  }

  async process(userInput: string): Promise<string> {
    this.messages.push({ role: 'user', content: userInput });
    
    let iterations = 0;
    while (iterations < 15) {
      console.log(`\x1b[36m[Mini-Meta] Strateji Geliştiriliyor (Iterasyon: ${iterations + 1})\x1b[0m`);
      const response = await this.client.chat(this.messages);
      let content = response.content.trim();
      this.messages.push({ role: 'assistant', content });

      // ÇOKLU ARAÇ AYIKLAMA (Süper Ajan Modu) 🌪️
      const toolCalls = Array.from(content.matchAll(/<tool_call name="([^"]+)"(?:\s+(?:path|filename)="([^"]+)")?>([\s\S]*?)<\/tool_call>/g));
      
      if (toolCalls.length > 0) {
        let multiFeedback = "";
        
        for (const match of toolCalls) {
          const toolName = match[1];
          const toolPath = match[2];
          const toolContent = match[3].trim();
          
          const tool = tools.find(t => t.name === toolName);
          if (tool) {
            console.log(`\x1b[33m[Mini-Meta] EYLEM: ${toolName} ${toolPath || ''}\x1b[0m`);
            
            let args: any = {};
            if (toolName === 'write_file' || toolName === 'replace_file_content') {
              args = { path: toolPath, diff: toolContent, content: toolContent };
            } else if (toolName === 'search' || toolName === 'fetch_url') {
              args = { query: toolContent, url: toolContent };
            } else {
              try { args = JSON.parse(toolContent); } catch { args = { data: toolContent }; }
            }

            try {
              const result = tool.execute(args);
              multiFeedback += `\n--- [SİSTEM GERİ BİLDİRİMİ: ${toolName}] ---\n${result}\n------------------------------`;
            } catch (e: any) {
              multiFeedback += `\n--- [SİSTEM HATASI: ${toolName}] ---\n${e.message}\n------------------------------`;
            }
          }
        }
        
        if (multiFeedback) {
          this.messages.push({ role: 'user', content: multiFeedback + "\n\nTüm araçlar çalıştırıldı. Sonuçları analiz et ve devam et." });
          iterations++;
          continue;
        }
      }

      return content;
    }
    return "Limit aşıldı.";
  }
}
