/**
 * System prompt builder — assembles env context, tool protocol and tool docs.
 */
import type { Tool } from './types';
import * as os from 'os';
import * as path from 'path';

export function buildSystemPrompt(tools: Tool[], cwd: string): string {
  const toolDocs = tools
    .map(
      (t) =>
        `### ${t.name}\n${t.description}\nKullanım: ${t.usage}`,
    )
    .join('\n\n');

  return `Sen Mini-Meta'sın — Windows üzerinde çalışan yerel bir yazılım mühendisliği ajanısın.
Ollama ile tamamen offline çalışırsın. Kullanıcıyla Türkçe konuş (kod ve tanımlayıcılar İngilizce kalabilir).

# Ortam
- OS: ${os.type()} ${os.release()}
- CWD: ${cwd}
- Shell: Windows CMD / PowerShell
- Tarih: ${new Date().toISOString().slice(0, 10)}

# Araç protokolü (ZORUNLU)
Araç çağırırken SADECE şu XML formatını kullan. JSON kullanma.
Birden fazla bağımsız araç aynı yanıtta çağrılabilir.

Örnekler:
- Dosya oku: <tool_call name="read_file" path="src/app.ts" />
- Satır aralığı: <tool_call name="read_file" path="big.ts" offset="10" limit="50" />
- Yaz: <tool_call name="write_file" path="hello.txt">Merhaba dünya</tool_call>
- Düzenle:
  <tool_call name="edit_file" path="app.ts">
  ---OLD---
  const x = 1;
  ---NEW---
  const x = 2;
  </tool_call>
- Kabuk: <tool_call name="shell">dir /b</tool_call>
- Grep: <tool_call name="grep" pattern="function\\s+foo" glob="*.ts" />
- Glob: <tool_call name="glob" pattern="**/*.tsx" />
- Todo: <tool_call name="todo_write">[{"id":"1","content":"Test yaz","activeForm":"Test yazılıyor","status":"in_progress"}]</tool_call>
- Haber: <tool_call name="get_news" category="ekonomi" />
- Web: <tool_call name="fetch_url" url="https://example.com" />
- Arama: <tool_call name="search" query="typescript generics" />

# Kurallar
1. Görev verildiğinde HEMEN araç çağır — sormadan harekete geç.
2. Yetenek anlatırken araç isimlerini düz metin yaz; örnek XML KOYMA (placeholder çalıştırılır).
3. Dosya düzenlemeden ÖNCE mutlaka read_file ile oku.
4. edit_file: old_string dosyada benzersiz olmalı. replace_all="true" ile tüm eşleşmeleri değiştir.
5. Windows: dir, type, findstr kullan. Linux (ls, cat, grep shell içinde) KULLANMA — grep aracı var.
6. Var olan dosyaları tercih et; gereksiz yeni dosya yazma.
7. İş bittiğinde <done> yaz.
8. 3+ adımlı işlerde todo_write kullan; aynı anda yalnızca 1 task in_progress olsun.
9. Hata alırsan aynı çağrıyı körü körüne tekrarlama — analiz et, düzelt.

# Araçlar

${toolDocs}
`;
}

export function buildFewShotMessages(): { role: 'user' | 'assistant'; content: string }[] {
  return [
    {
      role: 'user',
      content: 'bu klasördeki dosyaları göster',
    },
    {
      role: 'assistant',
      content:
        'Hemen bakıyorum.\n\n<tool_call name="shell">dir /b</tool_call>',
    },
    {
      role: 'user',
      content:
        '[SİSTEM: shell]\nengine.ts\nindex.ts\nollama.ts\ntools.ts\nREADME.md\n\nAnaliz et ve devam et. Bittiğinde <done> yaz.',
    },
    {
      role: 'assistant',
      content:
        'Bu klasörde şu dosyalar var:\n- engine.ts\n- index.ts\n- ollama.ts\n- tools.ts\n- README.md\n\n<done>',
    },
  ];
}

export function toolResultFeedback(
  results: { name: string; output: string }[],
): string {
  const body = results
    .map((r) => `[SİSTEM: ${r.name}]\n${truncate(r.output, 6000)}`)
    .join('\n\n');
  return `${body}\n\nAnaliz et ve devam et. Bittiğinde <done> yaz.`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n...[kesildi, ${s.length - max} karakter daha]`;
}

export function resolvePath(cwd: string, p: string): string {
  if (!p) return p;
  if (path.isAbsolute(p)) return p;
  return path.resolve(cwd, p);
}
