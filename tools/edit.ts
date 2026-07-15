import fs from 'fs';
import type { Tool } from '../types';
import type { SessionState } from '../state';
import { resolvePath } from '../prompt';

/** Normalize smart quotes so old_string matches straight-quote source */
function normalizeQuotes(str: string): string {
  return str
    .replaceAll('\u2018', "'")
    .replaceAll('\u2019', "'")
    .replaceAll('\u201C', '"')
    .replaceAll('\u201D', '"');
}

function findActualString(
  fileContent: string,
  searchString: string,
): string | null {
  if (fileContent.includes(searchString)) return searchString;

  const normalizedSearch = normalizeQuotes(searchString);
  const normalizedFile = normalizeQuotes(fileContent);
  const idx = normalizedFile.indexOf(normalizedSearch);
  if (idx !== -1) {
    return fileContent.substring(idx, idx + searchString.length);
  }

  // Whitespace-flexible: collapse runs of whitespace
  const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
  const cFile = collapse(fileContent);
  const cSearch = collapse(searchString);
  if (cFile.includes(cSearch) && searchString.length > 0) {
    // Best-effort: return original search — caller may still fail exact replace
    return null;
  }

  return null;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while (true) {
    const i = haystack.indexOf(needle, pos);
    if (i === -1) break;
    count++;
    pos = i + needle.length;
  }
  return count;
}

export function createEditTool(cwd: string, state: SessionState): Tool {
  return {
    name: 'edit_file',
    description:
      'Dosyada exact string replace. Önce read_file zorunlu. old_string benzersiz olmalı veya replace_all=true. Tırnak farklarını tolere eder.',
    usage:
      '<tool_call name="edit_file" path="a.ts">\n---OLD---\nold\n---NEW---\nnew\n</tool_call>',
    isConcurrencySafe: false,
    execute: (args) => {
      try {
        const filePath = resolvePath(cwd, String(args.path || ''));
        if (!args.path) return "Hata: 'path' parametresi eksik.";
        if (!fs.existsSync(filePath)) {
          return `Hata: Dosya bulunamadı: ${filePath}`;
        }

        if (!state.wasRead(filePath)) {
          return `Hata: Düzenlemeden önce read_file ile oku: ${filePath}`;
        }

        let oldString = String(args.old_string ?? '');
        let newString = String(args.new_string ?? '');
        const replaceAll = Boolean(args.replace_all);

        // Legacy SEARCH_BLOCK body in content/diff
        const diff = String(args.content || args.diff || '');
        if ((!oldString || !newString) && diff) {
          if (diff.includes('---OLD---') && diff.includes('---NEW---')) {
            const after = diff.split('---OLD---')[1] ?? '';
            const [o, n] = after.split('---NEW---');
            oldString = (o ?? '').trim();
            newString = (n ?? '').trim();
          } else if (diff.includes('REPLACE_BLOCK')) {
            const parts = diff.split(/REPLACE_BLOCK/i);
            oldString = parts[0].replace(/SEARCH_BLOCK/i, '').trim();
            newString = (parts[1] ?? '').trim();
          }
        }

        if (!oldString) {
          return "Hata: 'old_string' eksik. ---OLD--- ... ---NEW--- kullan.";
        }
        if (oldString === newString) {
          return 'Hata: old_string ve new_string aynı.';
        }

        const original = fs.readFileSync(filePath, 'utf8');
        const actualOld = findActualString(original, oldString) || oldString;

        if (!original.includes(actualOld)) {
          const snippet = original.slice(0, 400);
          return `Hata: old_string dosyada bulunamadı.\nDOSYA KESİTİ:\n${snippet}\n...\nDosyadan birebir kopyala (satır numarası N→ önekini YAZMA).`;
        }

        const occurrences = countOccurrences(original, actualOld);
        if (occurrences > 1 && !replaceAll) {
          return `Hata: old_string ${occurrences} kez geçiyor. Daha fazla bağlam ekle veya replace_all="true" kullan.`;
        }

        const updated = replaceAll
          ? original.split(actualOld).join(newString)
          : original.replace(actualOld, newString);

        fs.writeFileSync(filePath, updated, 'utf8');
        state.markRead(filePath);
        return `Dosya '${filePath}' güncellendi (${replaceAll ? occurrences : 1} değişiklik).`;
      } catch (error: unknown) {
        return `Hata: ${(error as Error).message}`;
      }
    },
  };
}
