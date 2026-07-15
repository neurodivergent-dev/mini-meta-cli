import { execSync } from 'child_process';
import type { Tool } from '../types';

export function createFetchUrlTool(): Tool {
  return {
    name: 'fetch_url',
    description:
      'Web sayfasını temiz metin olarak çeker. Dokümantasyon ve makale okumak için.',
    usage: '<tool_call name="fetch_url" url="https://example.com" />',
    isConcurrencySafe: true,
    execute: (args) => {
      try {
        const url = String(args.url || args.content || '');
        if (!url) return "Hata: 'url' parametresi eksik.";

        const output = execSync(`curl.exe -sL -m 20 "${url}"`, {
          encoding: 'utf8',
          timeout: 25_000,
          maxBuffer: 5 * 1024 * 1024,
          windowsHide: true,
        });

        let text = output
          .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, '')
          .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, '');

        const blocks = text.match(
          /<(p|h1|h2|h3|article)[^>]*>[\s\S]*?<\/\1>/gim,
        );
        if (blocks) {
          const cleanLines = blocks
            .map((m) => m.replace(/<[^>]*>?/gm, '').trim())
            .filter((l) => l.length > 20);
          const content = cleanLines.join('\n\n');
          if (content.length > 50) return content.slice(0, 8000);
        }

        const cleanText = text
          .replace(/<(header|footer|nav)\b[^>]*>[\s\S]*?<\/\1>/gim, '')
          .replace(/<[^>]*>?/gm, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        return cleanText.slice(0, 5000) || 'Sayfada okunabilir metin yok.';
      } catch (error: unknown) {
        return `Hata (Fetch): ${(error as Error).message}`;
      }
    },
  };
}

export function createNewsTool(): Tool {
  return {
    name: 'get_news',
    description:
      'TRT Haber RSS: sondakika | dunya | ekonomi. Bot engeline takılmaz.',
    usage: '<tool_call name="get_news" category="ekonomi" />',
    isConcurrencySafe: true,
    execute: (args) => {
      try {
        const category = String(args.category || args.content || 'sondakika');
        const rssUrls: Record<string, string> = {
          sondakika: 'https://www.trthaber.com/sondakika_articles.rss',
          dunya: 'https://www.trthaber.com/dunya_articles.rss',
          ekonomi: 'https://www.trthaber.com/ekonomi_articles.rss',
        };
        const url = rssUrls[category] || rssUrls.sondakika;

        const output = execSync(`curl.exe -sL -m 20 "${url}"`, {
          encoding: 'utf8',
          timeout: 25_000,
          windowsHide: true,
        });

        const news: string[] = [];
        const items = output.split('<item>').slice(1, 6);

        for (const item of items) {
          const title =
            item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || 'Başlık Yok';
          const description =
            item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ||
            'Özet Yok';
          const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
          const cleanTitle = title
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
            .trim();
          const cleanDesc = description
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
            .replace(/<[^>]*>?/gm, '')
            .trim();
          news.push(
            `📰 **${cleanTitle}**\n📝 ${cleanDesc.slice(0, 150)}...\n🔗 ${link}`,
          );
        }

        return news.join('\n\n') || 'Haber beslemesi boş veya ulaşılamıyor.';
      } catch (error: unknown) {
        return `Hata (News): ${(error as Error).message}`;
      }
    },
  };
}

export function createSearchTool(): Tool {
  return {
    name: 'search',
    description:
      'Genel web araması (Google HTML). Teknik dokümantasyon ve spesifik sorular için.',
    usage: '<tool_call name="search" query="typescript mapped types" />',
    isConcurrencySafe: true,
    execute: (args) => {
      try {
        const q = String(args.query || args.content || '');
        if (!q) return "Hata: 'query' parametresi eksik.";
        const query = encodeURIComponent(q);
        const url = `https://www.google.com/search?q=${query}&gbv=1`;
        const output = execSync(
          `curl.exe -sL -m 15 -A "Mozilla/5.0" "${url}"`,
          {
            encoding: 'utf8',
            timeout: 20_000,
            windowsHide: true,
          },
        );
        const textOnly = output
          .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, '')
          .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, '')
          .replace(/<[^>]*>?/gm, ' ')
          .replace(/\s+/g, ' ');
        return `Arama sonucu özeti:\n${textOnly.slice(0, 2000)}`;
      } catch (error: unknown) {
        return `Hata (Search): ${(error as Error).message}`;
      }
    },
  };
}
