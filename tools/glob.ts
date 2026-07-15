import fs from 'fs';
import path from 'path';
import type { Tool } from '../types';
import { resolvePath } from '../prompt';

export function createGlobTool(cwd: string): Tool {
  return {
    name: 'glob',
    description:
      'Dosya adlarına göre glob araması (örn. **/*.ts). Sonuçlar değişiklik zamanına göre sıralanır.',
    usage: '<tool_call name="glob" pattern="**/*.{ts,tsx}" path="." />',
    isConcurrencySafe: true,
    execute: (args) => {
      try {
        const pattern = String(args.pattern || args.content || args.query || '');
        if (!pattern) return "Hata: 'pattern' parametresi eksik.";

        const root = resolvePath(cwd, String(args.path || '.'));
        const files: { file: string; mtime: number }[] = [];
        const skip = new Set([
          'node_modules',
          '.git',
          'dist',
          'build',
          '.next',
          'coverage',
          'android',
          'ios',
        ]);

        const re = globToRegExp(pattern);
        const stack = [root];

        while (stack.length && files.length < 200) {
          const dir = stack.pop()!;
          let entries: fs.Dirent[];
          try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
          } catch {
            continue;
          }
          for (const ent of entries) {
            if (skip.has(ent.name)) continue;
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
              stack.push(full);
            } else if (ent.isFile()) {
              const rel = path.relative(root, full).replace(/\\/g, '/');
              if (re.test(rel) || re.test(ent.name)) {
                try {
                  files.push({ file: full, mtime: fs.statSync(full).mtimeMs });
                } catch {
                  files.push({ file: full, mtime: 0 });
                }
              }
            }
          }
        }

        files.sort((a, b) => b.mtime - a.mtime);
        if (!files.length) return 'Eşleşen dosya yok.';
        return files.map((f) => f.file).join('\n');
      } catch (error: unknown) {
        return `Hata: ${(error as Error).message}`;
      }
    },
  };
}

function globToRegExp(glob: string): RegExp {
  let g = glob.replace(/\\/g, '/');
  // Escape regex specials except * ?
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') {
      re += '.*';
      i++;
      if (g[i + 1] === '/') i++;
    } else if (c === '*') {
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '{') {
      // {a,b} → (a|b)
      const end = g.indexOf('}', i);
      if (end !== -1) {
        const inner = g.slice(i + 1, end);
        re += '(' + inner.split(',').map(escapeRegExp).join('|') + ')';
        i = end;
      } else {
        re += '\\{';
      }
    } else if ('+^$()|[]'.includes(c)) {
      re += '\\' + c;
    } else if (c === '.') {
      re += '\\.';
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$', 'i');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}
