import * as readline from 'readline';
import { MiniTenguEngine } from './engine';

const modelArg = process.argv.find((a) => a.startsWith('--model='))?.split('=')[1];
const engine = new MiniTenguEngine({ model: modelArg });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let closed = false;
rl.on('close', () => {
  closed = true;
});

console.log(`
  \x1b[35m╭───────────────────────────────────────╮
  │       Mini-Meta CLI v2.0              │
  │   Local Agentic Coding · Ollama       │
  │   model: ${engine.modelName.padEnd(28)}│
  ╰───────────────────────────────────────╯\x1b[0m
`);

console.log(`Komutlar: exit | clear | todos | help
Model: MINI_META_MODEL env veya --model=adı
`);

function printHelp(): void {
  console.log(`
  \x1b[36mYardım\x1b[0m
  • exit / quit  — çık
  • clear        — konuşma geçmişini temizle
  • todos        — todo listesini göster
  • help         — bu mesaj

  Örnek görevler:
  • "src altındaki tüm .ts dosyalarını listele"
  • "engine.ts içindeki process metodunu oku ve özetle"
  • "my-web-site klasöründe modern bir landing page oluştur"
  • "ekonomi haberlerini çek ve economy_report.txt'ye yaz"
`);
}

async function ask(): Promise<void> {
  if (closed) return;
  rl.question('\x1b[32m❯ \x1b[0m', async (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
      ask();
      return;
    }

    const lower = trimmed.toLowerCase();
    if (lower === 'exit' || lower === 'quit') {
      console.log('Görüşürüz.');
      process.exit(0);
    }
    if (lower === 'clear') {
      engine.clearHistory();
      console.log('\x1b[90mGeçmiş temizlendi.\x1b[0m\n');
      ask();
      return;
    }
    if (lower === 'todos') {
      console.log(engine.todos + '\n');
      ask();
      return;
    }
    if (lower === 'help' || lower === '?') {
      printHelp();
      ask();
      return;
    }

    try {
      await engine.process(trimmed);
      console.log('');
    } catch (error: unknown) {
      console.log(`\n\x1b[31m[Hata]\x1b[0m ${(error as Error).message}\n`);
    }

    ask();
  });
}

ask();
