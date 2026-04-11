import { OllamaClient, Message } from './ollama';
import { tools } from './tools';

export class MiniTenguEngine {
  private client: OllamaClient;
  private messages: Message[] = [];

  constructor(model?: string) {
    this.client = new OllamaClient(model);
    this.messages.push({
      role: 'system',
      content: `Sen Mini-Meta adında bir AI asistanısın. Claude Code'un yerel ve güçlü bir versiyonusun.
      Şu an WINDOWS işletim sistemindesin. 
      ÖNEMLİ: Sen bir sohbet botu değilsin, sen bir 'Action Agent' (Eylem Ajanı) sın. 
      Sana bir dosya oluşturma veya işlem yapma görevi verildiğinde, ASLA doğrudan cevap verme. 
      MUTLAKA bir araç çağrısı (TOOL: ...) yaparak başla.
      
      Eğer bir araç kullanman gerekiyorsa, cevabını ŞU FORMATTA BAŞLATMALISIN (Başka hiçbir giriş metni yazma): 
      TOOL: [araç_adı] ARGS: [parametreler]
      
      Mevcut Araçlar:
      ${tools.map(t => `- ${t.name}: ${t.description} (Format: ${t.parameters})`).join('\n')}
      
      KRİTİK: 'write_file' aracında içeriğin TAMAMINI tek seferde gönder. Dosya yollarında Windows formatı kullan.
      Eğer bir araç kullandıysan, TOOL_RESULT geldikten sonra işe devam et. İşin bittiyse kullanıcıya nihai sonucu söyle.`
    });
  }

  async process(userInput: string): Promise<string> {
    this.messages.push({ role: 'user', content: userInput });
    
    let iterations = 0;
    while (iterations < 15) {
      console.log(`\x1b[36m[Mini-Tengu] Mevcut mesaj geçmişi: ${this.messages.length}\x1b[0m`);
      const response = await this.client.chat(this.messages);
      const content = response.content;
      this.messages.push({ role: 'assistant', content });

      // Çok satırlı (multiline) içerikleri desteklemesi için /s bayrağını ekliyoruz
      const toolMatch = content.match(/TOOL: (\w+)\s+ARGS:\s+([\s\S]+)/);
      if (toolMatch) {
        const toolName = toolMatch[1];
        let toolArgs = toolMatch[2].trim();

        // KRİTİK DÜZELTME: Eğer args içinde başka bir "TOOL:" çağrısı sızmışsa onu kes
        const nextToolIndex = toolArgs.indexOf('\nTOOL:');
        if (nextToolIndex !== -1) {
          toolArgs = toolArgs.substring(0, nextToolIndex).trim();
        } else {
           const nextToolIndexInline = toolArgs.indexOf('TOOL:');
           if (nextToolIndexInline > 0) {
             toolArgs = toolArgs.substring(0, nextToolIndexInline).trim();
           }
        }

        const tool = tools.find(t => t.name === toolName);

        if (tool) {
          console.log(`\x1b[33m[Mini-Tengu] Araç Çağrılıyor: ${toolName}(${toolArgs})\x1b[0m`);
          const result = tool.execute(toolArgs);
          
          const feedback = `\n--- [SİSTEM BİLGİSİ] ---\nARAÇ: ${toolName}\nSONUÇ: ${result}\n------------------------\nBİLGİ: İşlem başarıyla tamamlandı. Artık aynı aracı tekrar çağırmana GEREK YOK. Bir sonraki adıma geç veya kullanıcıya yanıt ver.`;
          
          this.messages.push({ role: 'user', content: feedback }); 
          iterations++;
          continue;
        }
      }

      return content;
    }

    return "İşlem zaman aşımına uğradı.";
  }
}
