import { MiniTenguEngine } from './engine';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const engine = new MiniTenguEngine();

console.log(`\x1b[36m
  ╭───────────────────────────────────╮
  │       Mini-Meta CLI v1.0          │
  │   Ollama-Powered Agentic Bot      │
  ╰───────────────────────────────────╯
\x1b[0m`);
console.log("Mini-Meta hazır! Sorunu yaz (Çıkmak için 'exit').\n");

async function ask() {
  rl.question('\x1b[32m❯ \x1b[0m', async (input) => {
    if (input.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    try {
      console.log('\x1b[90m(Mini-Tengu düşünüyor...)\x1b[0m');
      const response = await engine.process(input);
      console.log(`\n\x1b[37m${response}\x1b[0m\n`);
    } catch (e: any) {
      console.error('\n\x1b[31m[Hata]\x1b[0m', e.message);
    }

    ask(); // Devam et
  });
}

ask();
