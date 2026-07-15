import fs from 'fs';
import path from 'path';
import type { Tool } from '../types';
import type { SessionState } from '../state';
import { resolvePath } from '../prompt';

function cleanMarkdownFences(content: string): string {
  return content
    .replace(/^```[\w]*\r?\n/gm, '')
    .replace(/\r?\n```\s*$/gm, '')
    .replace(/^```$/gm, '')
    .trimEnd();
}

export function createWriteTool(cwd: string, state: SessionState): Tool {
  return {
    name: 'write_file',
    description:
      'Dosya oluşturur veya tamamen üzerine yazar. Üst dizinler yoksa oluşturur. Mümkünse edit_file tercih et.',
    usage: '<tool_call name="write_file" path="out.txt">içerik</tool_call>',
    isConcurrencySafe: false,
    execute: (args) => {
      try {
        const filePath = resolvePath(cwd, String(args.path || ''));
        let content = args.content;
        if (content === undefined || content === null) {
          return "Hata: 'path' veya 'content' eksik.";
        }
        if (!args.path) return "Hata: 'path' parametresi eksik.";

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const clean = cleanMarkdownFences(String(content));
        fs.writeFileSync(filePath, clean, 'utf8');
        state.markRead(filePath);
        return `Dosya '${filePath}' kaydedildi (${clean.length} karakter).`;
      } catch (error: unknown) {
        return `Hata: ${(error as Error).message}`;
      }
    },
  };
}
