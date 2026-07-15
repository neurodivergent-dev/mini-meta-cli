import fs from 'fs';
import type { Tool } from '../types';
import type { SessionState } from '../state';
import { resolvePath } from '../prompt';

const MAX_LINES = 2000;
const MAX_CHARS = 100_000;

/** cat -n style line numbers for easy reference in later edits */
export function addLineNumbers(content: string, startLine = 1): string {
  const lines = content.split('\n');
  const width = String(startLine + lines.length - 1).length;
  return lines
    .map((line, i) => {
      const n = String(startLine + i).padStart(width, ' ');
      return `${n}→${line}`;
    })
    .join('\n');
}

export function createReadTool(cwd: string, state: SessionState): Tool {
  return {
    name: 'read_file',
    description:
      'Dosya okur. Sonuçlar satır numaralı (N→satır) gelir. offset/limit ile parça oku. Dizini okumak için shell kullan.',
    usage:
      '<tool_call name="read_file" path="file.ts" /> veya offset="1" limit="50"',
    isConcurrencySafe: true,
    execute: (args) => {
      try {
        const filePath = resolvePath(cwd, String(args.path || ''));
        if (!args.path) return "Hata: 'path' parametresi eksik.";
        if (!fs.existsSync(filePath)) {
          return `Hata: Dosya bulunamadı: ${filePath}`;
        }
        if (fs.statSync(filePath).isDirectory()) {
          return `Hata: Bu bir dizin. shell ile dir kullan: dir "${filePath}"`;
        }

        const raw = fs.readFileSync(filePath, 'utf8');
        state.markRead(filePath);

        const offset = Math.max(1, Number(args.offset) || 1);
        const limit = Math.min(MAX_LINES, Number(args.limit) || MAX_LINES);
        const allLines = raw.split('\n');
        const slice = allLines.slice(offset - 1, offset - 1 + limit);
        let text = addLineNumbers(slice.join('\n'), offset);

        if (text.length > MAX_CHARS) {
          text = text.slice(0, MAX_CHARS) + '\n...[dosya kısaltıldı]';
        }

        const more =
          offset - 1 + slice.length < allLines.length
            ? `\n\n(${allLines.length} satırın ${offset}-${offset + slice.length - 1} arası gösterildi)`
            : '';

        return text + more;
      } catch (error: unknown) {
        return `Hata: ${(error as Error).message}`;
      }
    },
  };
}
