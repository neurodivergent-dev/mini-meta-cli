import { execSync } from 'child_process';
import type { Tool } from '../types';
import { checkShellCommand } from '../permissions';

export function createShellTool(cwd: string): Tool {
  return {
    name: 'shell',
    description:
      'Windows CMD/PowerShell komutu çalıştırır. Bağımsız komutları ayrı çağrılarda, bağımlı olanları && ile zincirle.',
    usage: '<tool_call name="shell">dir /b</tool_call>',
    isConcurrencySafe: false,
    execute: (args) => {
      try {
        const command = String(args.command || args.content || '').trim();
        if (!command) return "Hata: 'command' parametresi eksik.";

        const perm = checkShellCommand(command);
        if (!perm.allowed) return perm.reason || 'Komut engellendi.';
        if (perm.warning) console.log(`\x1b[33m[Uyarı] ${perm.warning}\x1b[0m`);

        const output = execSync(command, {
          encoding: 'utf8',
          cwd,
          timeout: 60_000,
          maxBuffer: 2 * 1024 * 1024,
          windowsHide: true,
        });
        return output || 'Komut başarıyla çalıştı (çıktı yok).';
      } catch (error: unknown) {
        const e = error as { message?: string; stdout?: string; stderr?: string };
        const parts = [e.stderr, e.stdout, e.message].filter(Boolean);
        return `Hata: ${parts.join('\n') || 'bilinmeyen'}`;
      }
    },
  };
}
