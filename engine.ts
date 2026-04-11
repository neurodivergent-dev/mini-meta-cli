import { OllamaClient, Message } from './ollama';
import { tools } from './tools';

export class MiniTenguEngine {
  private client: OllamaClient;
  private messages: Message[] = [];

  constructor(model?: string) {
    this.client = new OllamaClient(model);
    this.messages.push({
      role: 'system',
      content: `Sen Mini-Meta'sın, Windows üzerinde çalışan yerel bir EYLEM AJANI'sın.
Kullanıcıyla Türkçe konuş. Görevleri yerine getirmek için araçları MUTLAKA kullan.
Araç çağırırken SADECE şu formatı kullan:
- Dosya oku: <tool_call name="read_file" path="dosya.txt" />
- İnternet ara: <tool_call name="search" query="arama sorgusu" />
- Komut çalıştır: <tool_call name="shell">dir /b</tool_call>

KURALLAR:
- Bir görev verildiğinde HEMEN araç çağrısı yap, sormadan harekete geç.
- Yeteneklerini anlatırken araç isimlerini düz metin olarak yaz, XML etiketi KULLANMA.
- İşin bittiğinde <done> yaz.
- Windows CMD kullan: dir, type, findstr. Linux komutları (ls, cat) KULLANMA.`
    });
    // Few-shot: Modele araç formatını çeşitli örneklerle öğret
    this.messages.push({ role: 'user', content: 'bu klasördeki dosyaları göster' });
    this.messages.push({ role: 'assistant', content: 'Hemen bakıyorum.\n\n<tool_call name="shell">dir /b</tool_call>' });
    this.messages.push({ role: 'user', content: '[SİSTEM: shell]\nengine.ts\nindex.ts\nollama.ts\ntools.ts\nREADME.md\n\nAnaliz et ve devam et. Bittiğinde <done> yaz.' });
    this.messages.push({ role: 'assistant', content: 'Bu klasörde şu dosyalar var:\n- engine.ts\n- index.ts\n- ollama.ts\n- tools.ts\n- README.md\n\n<done>' });
  }

  async process(userInput: string): Promise<string> {
    this.messages.push({ role: 'user', content: userInput });

    let iterations = 0;
    let consecutiveErrors = 0;
    while (iterations < 10) {
      // İlk 5 mesaj: system + few-shot örnekler (her zaman gönder)
      // Son 4 mesaj: gerçek konuşma geçmişi
      const fewShotCount = 5;
      const recentMessages = this.messages.slice(fewShotCount).slice(-4);
      const slidingMessages = [...this.messages.slice(0, fewShotCount), ...recentMessages];
      console.log(`\x1b[36m[Mini-Meta] Düşünüyor...\x1b[0m`);

      try {
        const response = await this.client.chat(slidingMessages);
        consecutiveErrors = 0; // başarılı yanıt, sıfırla
        let content = response.content?.trim() || '';

        if (!content) {
          this.messages.push({ role: 'user', content: "Hata: Yanıt boş." });
          iterations++;
          continue;
        }

        // Hem normal, hem kapanmamış hem de self-closing etiketleri yakalayan tek bir esnek RegEx
        const toolPattern = /<tool_call\s+([^>]+)>(?:([\s\S]*?)<\/tool_call>)?/gi;

        interface ParsedCall { name: string; path?: string; content: string; raw: string; }
        const parsedCalls: ParsedCall[] = [];

        for (const match of content.matchAll(toolPattern)) {
          const attrs = match[1];
          const body = match[2]?.trim() || '';
          
          const nameMatch = attrs.match(/name=["']([^"']+)["']/);
          const pathMatch = attrs.match(/(?:path|filename)=["']([^"']+)["']/);
          const extraMatch = attrs.match(/(?:category|query|url|text|command)=["']([^"']+)["']/);
          
          if (nameMatch) {
            parsedCalls.push({
              name: nameMatch[1],
              path: pathMatch?.[1],
              content: body || extraMatch?.[1] || '',
              raw: match[0]
            });
          }
        }

        // Temizleme RegEx'ini de kapanmayan etiketleri temizleyecek şekilde güncelleyin:
        const cleanPattern = /<tool_call\s+[^>]+>(?:[\s\S]*?<\/tool_call>)?/gi;
        const assistantText = content.replace(cleanPattern, "").trim();
        if (assistantText) {
          console.log(`\x1b[35m[Ajan]:\x1b[0m ${assistantText}`);
        }

        this.messages.push({ role: 'assistant', content });

        if (parsedCalls.length > 0) {
          let multiFeedback = "";
          let realCallCount = 0;

          // Placeholder/örnek içerikler — bunları gerçek çağrı olarak çalıştırma
          // YENİ:
          const placeholders = [
            'komut', 'içerik', 'içerik buraya', 'aranacak metin', 'aranan kelime',
            'url', 'sorgu', 'arama sorgusu', 'kategori', 'dosya_yolu', 'yol',
            'dosya.txt', 'yeni.txt', 'https://example.com',
            'eski metin', 'yeni metin', 'sondakika', 'dir /b'
          ];

          for (const call of parsedCalls) {
            let toolName = call.name;
            const toolPath = call.path;
            const toolContent = call.content;

            // Placeholder kontrolü
            if (placeholders.includes(toolContent.toLowerCase()) || placeholders.includes(toolPath?.toLowerCase() || '')) {
              continue;
            }

            const aliases: any = { 'read': 'read_file', 'write': 'write_file', 'replace': 'replace_file_content' };
            if (aliases[toolName]) toolName = aliases[toolName];

            const tool = tools.find(t => t.name === toolName);
            if (tool) {
              realCallCount++;
              console.log(`\x1b[33m[Mini-Meta] EYLEM: ${tool.name} ${toolPath || ''}\x1b[0m`);
              const result = tool.execute({ path: toolPath, content: toolContent, diff: toolContent, command: toolContent, query: toolContent, text: toolContent, category: toolContent });
              multiFeedback += `\n[SİSTEM: ${tool.name}]\n${result}\n`;
            }
          }

          if (realCallCount > 0) {
            this.messages.push({ role: 'user', content: multiFeedback + "\nAnaliz et ve devam et. Bittiğinde <done> yaz." });
            iterations++;
            continue;
          }
        }

        if (content.toLowerCase().includes("<done>")) return content.replace(/<done>/gi, "").trim();
        return content;

      } catch (e: any) {
        consecutiveErrors++;
        const isTimeout = e.message?.includes('timeout');
        const isEOF = e.message === 'EOF';
        console.log(`\x1b[31m[Hata] ${isTimeout ? 'Ollama zaman aşımı.' : isEOF ? 'Model yüklenemedi (EOF). Ollama\'yı yeniden başlatmayı deneyin.' : e.message}\x1b[0m`);

        if (consecutiveErrors >= 2) {
          console.log(`\x1b[31m[Mini-Meta] Ardışık ${consecutiveErrors} hata. Vazgeçiliyor.\x1b[0m`);
          return "Ollama bağlantı hatası. 'ollama serve' komutunu kontrol edin.";
        }
        iterations++;
        continue;
      }
    }
    return "Limit aşıldı.";
  }
}
