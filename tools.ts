import { execSync } from 'child_process';
import fs from 'fs';
import axios from 'axios';

export interface Tool {
  name: string;
  description: string;
  parameters: string;
  execute: (args: any) => string;
}

export const tools: Tool[] = [
  {
    name: 'shell',
    description: 'Windows komut satırında (CMD/Powershell) komut çalıştırır.',
    parameters: '{ "command": "string" }',
    execute: (args: any) => {
      try {
        const command = args.command;
        if (!command) return "Hata: 'command' parametresi eksik.";
        const output = execSync(command, { encoding: 'utf8' });
        return output || 'Komut başarıyla çalıştı (Çıktı yok).';
      } catch (error: any) {
        return `Hata: ${error.message}`;
      }
    }
  },
  {
    name: 'read_file',
    description: 'Bir dosyanın içeriğini okur.',
    parameters: '{ "path": "string" }',
    execute: (args: any) => {
      try {
        const path = args.path;
        if (!path) return "Hata: 'path' parametresi eksik.";
        return fs.readFileSync(path, 'utf8');
      } catch (error: any) {
        return `Hata: ${error.message}`;
      }
    }
  },
  {
    name: 'write_file',
    description: 'Bir dosyayı belirtilen yol ve isimle kaydeder veya günceller.',
    parameters: '{ "path": "string", "content": "string" }',
    execute: (args: any) => {
      try {
        const filePath = args.path || args.filename;
        const content = args.content;
        if (!filePath || content === undefined) return "Hata: 'path' veya 'content' eksik.";
        
        // Gereksiz import yerine direkt Node.js path modülünü kullanalım (veya manual split)
        const parts = filePath.split(/[\\/]/);
        if (parts.length > 1) {
            const dir = parts.slice(0, -1).join('/');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }

        fs.writeFileSync(filePath, content);
        return `Dosya '${filePath}' başarıyla kaydedildi.`;
      } catch (error: any) {
        return `Hata: ${error.message}`;
      }
    }
  },
  {
    name: 'grep_files',
    description: 'Tüm dosyalarda belirli bir metni arar.',
    parameters: '{ "text": "string" }',
    execute: (args: any) => {
      try {
        const text = args.text;
        if (!text) return "Hata: 'text' parametresi eksik.";
        const output = execSync(`findstr /s /i /n /c:"${text}" *.*`, { encoding: 'utf8' });
        return output || 'Eşleşme bulunamadı.';
      } catch (error: any) {
        return `Hata: ${error.message}`;
      }
    }
  },
  {
    name: 'fetch_url',
    description: 'Bir web sayfasının içeriğini temiz metin olarak çeker. Haber okumak için idealdir.',
    parameters: '{ "url": "string" }',
    execute: (args: any) => {
      try {
        const url = args.url;
        if (!url) return "Hata: 'url' parametresi eksik.";
        
        // curl ile sayfayı çekiyoruz (UTF-8 zorlaması ile)
        const output = execSync(`curl.exe -sL -m 20 "${url}"`, { encoding: 'utf8' });
        
        // Smart Scraper Mantığı: 
        // 1. Script ve Style bloklarını tamamen siliyoruz
        let text = output.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
        text = text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
        
        // 2. Sadece anlamlı etiketlerin içeriğini topluyoruz (p, h1, h2, h3, article)
        const toolMatch = text.match(/<(p|h1|h2|h3|article)[^>]*>([\s\S]*?)<\/\1>/gim);
        
        if (toolMatch) {
            const cleanLines = toolMatch.map(m => m.replace(/<[^>]*>?/gm, '').trim()).filter(l => l.length > 20);
            const content = cleanLines.join('\n\n');
            if (content.length > 50) return content.slice(0, 8000);
        }

        // 3. Fallback: Daha agresif temizlik
        const cleanText = text
          .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
          .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
          .replace(/<header\b[^>]*>([\s\S]*?)<\/header>/gim, "")
          .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gim, "")
          .replace(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gim, "")
          .replace(/<[^>]*>?/gm, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        return cleanText.slice(0, 5000) || "Sayfada okunabilir metin bulunamadı.";
      } catch (error: any) {
        return `Hata (Fetch): ${error.message}`;
      }
    }
  },
  {
    name: 'get_news',
    description: 'Türkiye ve dünyadan en güncel son dakika haberlerini RSS üzerinden çeker. Bot engeline takılmaz.',
    parameters: '{ "category": "string (opsiyonel: sondakika, dunya, ekonomi)" }',
    execute: (args: any) => {
      try {
        const category = args.category || 'sondakika';
        const rssUrls: any = {
            'sondakika': 'https://www.trthaber.com/sondakika_articles.rss',
            'dunya': 'https://www.trthaber.com/dunya_articles.rss',
            'ekonomi': 'https://www.trthaber.com/ekonomi_articles.rss'
        };
        const url = rssUrls[category] || rssUrls['sondakika'];
        
        const output = execSync(`curl.exe -sL -m 20 "${url}"`, { encoding: 'utf8' });
        
        // Hızlı bir regex XML parse
        const news: string[] = [];
        const items = output.split('<item>').slice(1, 6); // İlk 5 haberi alalım
        
        items.forEach(item => {
            const title = item.match(/<title>(.*?)<\/title>/)?.[1] || 'Başlık Yok';
            const description = item.match(/<description>(.*?)<\/description>/)?.[1] || 'Özet Yok';
            const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
            const cleanTitle = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
            const cleanDesc = description.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>?/gm, '').trim();
            news.push(`📰 **${cleanTitle}**\n📝 ${cleanDesc.slice(0, 150)}...\n🔗 ${link}`);
        });

        return news.join('\n\n') || "Haber beslemesi şu an boş veya ulaşılamıyor.";
      } catch (error: any) {
        return `Hata (News): ${error.message}`;
      }
    }
  },
  {
    name: 'search',
    description: 'Genel internet araması yapar. Teknik dokümantasyon veya spesifik bilgiler için kullan.',
    parameters: '{ "query": "string" }',
    execute: (args: any) => {
      try {
        const query = encodeURIComponent(args.query);
        if (!query) return "Hata: 'query' parametresi eksik.";
        const url = `https://www.google.com/search?q=${query}&gbv=1&sei=none`;
        const output = execSync(`curl.exe -sL -m 15 -A "Mozilla/5.0" "${url}"`, { encoding: 'utf8' });
        fs.writeFileSync('search_debug.html', output);
        const textOnly = output.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ');
        return `Arama başarılıydı. Ham veri özeti:\n${textOnly.slice(0, 1500)}`;
      } catch (error: any) {
        return `Hata (Search): ${error.message}`;
      }
    }
  },
  {
    name: 'replace_file_content',
    description: 'Bir dosya içindeki belirli bir metin bloğunu yenisiyle değiştirir. Boşluk farklılıklarını tolere eder.',
    parameters: '{ "path": "string", "diff": "string (SEARCH_BLOCK ve REPLACE_BLOCK içerir)" }',
    execute: (args: any) => {
      try {
        const filePath = args.path;
        const diff = args.diff || args.content || "";
        if (!filePath) return "Hata: 'path' parametresi eksik.";
        if (!fs.existsSync(filePath)) return `Hata: Dosya bulunamadı: ${filePath}`;

        const parts = diff.split('REPLACE_BLOCK');
        if (parts.length < 2) return "Hata: 'REPLACE_BLOCK' bulunamadı.";
        
        const oldText = parts[0].replace('SEARCH_BLOCK', '').trim();
        const newText = parts[1].trim();

        let content = fs.readFileSync(filePath, 'utf8');
        
        // Esnek Eşleştirme (Whitespace normalization)
        const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
        const normalizedContent = normalize(content);
        const normalizedOldText = normalize(oldText);

        if (!normalizedContent.includes(normalizedOldText)) {
            // DEBUG: Ajan yanlış görüyorsa ona gerçeği göster
            const snippet = content.slice(0, 300);
            return `Hata: Değiştirilmek istenen metin dosyada bulunamadı.\nDOSYA İÇERİĞİNDEN KESİT:\n${snippet}\n...\nLütfen metni yukarıdaki gerçek içeriğe göre tam kopyala.`;
        }

        if (content.includes(oldText)) {
            const updatedContent = content.replace(oldText, newText);
            fs.writeFileSync(filePath, updatedContent);
            return `Dosya '${filePath}' başarıyla güncellendi.`;
        } else {
            // Normalize hali uyuyor ama kendi uymuyorsa zorla (veya hata ver)
            const updatedContent = content.replace(oldText.split('\n')[0], newText); // riskli ama denenebilir
            return `Hata: Boşluk farkı çok büyük. Lütfen dosyadan tam kopyala.`;
        }
      } catch (error: any) {
        return `Hata: ${error.message}`;
      }
    }
  }
];
