import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { Tool } from '../types';
import { resolvePath } from '../prompt';

/**
 * Grep tool — prefers ripgrep, falls back to a recursive text walk.
 */
export function createGrepTool(cwd: string): Tool {
  return {
    name: 'grep',
    description:
      'Dosya içeriğinde regex/metin arar. path ve glob ile filtrele. Shell içinde grep/findstr KULLANMA — bu aracı kullan.',
    usage:
      '<tool_call name="grep" pattern="TODO" path="." glob="*.ts" />',
    isConcurrencySafe: true,
    execute: (args) => {
      try {
        const pattern = String(args.pattern || args.text || args.query || '');
        if (!pattern) return "Hata: 'pattern' parametresi eksik.";

        const searchPath = resolvePath(cwd, String(args.path || '.'));
        const glob = args.glob ? String(args.glob) : '';

        // Try ripgrep first
        try {
          let cmd = `rg --line-number --color never --max-count 50 -e ${shellQuote(pattern)}`;
          if (glob) cmd += ` --glob ${shellQuote(glob)}`;
          cmd += ` ${shellQuote(searchPath)}`;
          const out = execSync(cmd, {
            encoding: 'utf8',
            cwd,
            timeout: 30_000,
            windowsHide: true,
          });
          return out || 'Eşleşme bulunamadı.';
        } catch (rgErr: unknown) {
          const e = rgErr as { status?: number; stdout?: string; message?: string };
          // rg exit 1 = no matches
          if (e.status === 1) return 'Eşleşme bulunamadı.';
          if (e.stdout) return e.stdout;
          // fall through if rg missing
        }

        // Fallback: recursive walk + includes
        const results: string[] = [];
        const maxResults = 80;
        walk(searchPath, glob, (file) => {
          if (results.length >= maxResults) return;
          try {
            const text = fs.readFileSync(file, 'utf8');
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (results.length >= maxResults) break;
              let hit = false;
              try {
                hit = new RegExp(pattern, 'i').test(lines[i]);
              } catch {
                hit = lines[i].toLowerCase().includes(pattern.toLowerCase());
              }
              if (hit) {
                results.push(`${file}:${i + 1}:${lines[i].slice(0, 200)}`);
              }
            }
          } catch {
            /* binary / unreadable */
          }
        });

        return results.length ? results.join('\n') : 'Eşleşme bulunamadı.';
      } catch (error: unknown) {
        return `Hata: ${(error as Error).message}`;
      }
    },
  };
}

function shellQuote(s: string): string {
  if (process.platform === 'win32') {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function walk(
  root: string,
  glob: string,
  onFile: (file: string) => void,
): void {
  if (!fs.existsSync(root)) return;
  const st = fs.statSync(root);
  if (st.isFile()) {
    if (matchGlob(root, glob)) onFile(root);
    return;
  }

  const skip = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
  ]);

  const stack = [root];
  while (stack.length) {
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
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile() && matchGlob(full, glob)) onFile(full);
    }
  }
}

function matchGlob(file: string, glob: string): boolean {
  if (!glob) return true;
  // Simple *.ext or **/*.ext
  const name = path.basename(file);
  if (glob.startsWith('*.')) {
    return name.endsWith(glob.slice(1));
  }
  if (glob.includes('*')) {
    const re = new RegExp(
      '^' +
        glob
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/\\\\]*') +
        '$',
      'i',
    );
    return re.test(file) || re.test(name);
  }
  return file.includes(glob) || name.includes(glob);
}
