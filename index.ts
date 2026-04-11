import * as readline from 'readline';
import { MiniTenguEngine } from './engine';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const engine = new MiniTenguEngine();

console.log(`
  \x1b[35m╭───────────────────────────────────╮
  │       Mini-Meta CLI v1.5          │
  │   Prometheus 3.0 Otonom Mod       │
  ╰───────────────────────────────────╯\x1b[0m
`);

console.log("Mini-Meta hazır! Sorunu yaz (Çıkmak için 'exit').\n");

async function ask() {
  rl.question('\x1b[32m❯ \x1b[0m', async (input) => {
    if (input.toLowerCase() === 'exit') {
      process.exit();
    }

    try {
      // Motor zaten kendi içinde console.log/stream basıyor, sonucu tekrar basmaya gerek yok
      await engine.process(input);
      console.log(""); // Sadece bir satır boşluk bırakalım
    } catch (error: any) {
      console.log(`\n\x1b[31m[Hata]\x1b[0m ${error.message}\n`);
    }

    ask();
  });
}

ask();
