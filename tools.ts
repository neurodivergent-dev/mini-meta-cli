import { execSync } from 'child_process';
import fs from 'fs';
import axios from 'axios';

export interface Tool {
  name: string;
  description: string;
  parameters: string;
  execute: (args: string) => string;
}

export const tools: Tool[] = [
  {
    name: 'shell',
    description: 'Windows komut satırında (CMD/Powershell) komut çalıştırır. Örn: dir, type, git status, cd vb.',
    parameters: 'Çalıştırılacak Windows komutu',
    execute: (command: string) => {
      try {
        const output = execSync(command, { encoding: 'utf8' });
        return output || 'Komut başarıyla çalıştı (Çıktı yok).';
      } catch (error: any) {
        return `Hata: ${error.message}`;
      }
    }
  },
  {
    name: 'read_file',
    description: 'Bir dosyanın içeriğini okur.',
    parameters: 'Dosya yolu',
    execute: (path: string) => {
      try {
        return fs.readFileSync(path, 'utf8');
      } catch (error: any) {
        return `Hata: ${error.message}`;
      }
    }
  },
  {
    name: 'write_file',
    description: 'Bir dosyayı mevcut klasöre kaydeder. Format: "dosya_ismi::CONTENT::içerik"',
    parameters: 'dosya_ismi::CONTENT::içerik',
    execute: (input: string) => {
      try {
        const parts = input.split('::CONTENT::');
        let filename = parts[0]?.trim() || '';
        // Eğer model tam yol yazmaya çalışırsa sadece dosya adını alalım
        filename = filename.split(/[\\/]/).pop() || 'file.txt';
        
        let content = parts.slice(1).join('::CONTENT::');
        
        // Model bazen kodu koca bir string tırnağı içine alıyor, onu temizleyelim
        content = content.trim();
        if (content.startsWith('"') && content.endsWith('"')) {
          content = content.slice(1, -1);
        }
        
        // Kaçış karakterli \n (literal \n) dizilerini gerçek satır başlarına çevirelim
        content = content.replace(/\\n/g, '\n');
        
        fs.writeFileSync(filename, content);
        return `Dosya '${filename}' başarıyla kaydedildi. İçerik temizlendi ve normalize edildi.`;
      } catch (error: any) {
        return `Hata: ${error.message}`;
      }
    }
  },
  {
    name: 'grep_files',
    description: 'Tüm dosyalarda belirli bir metni arar (Windows findstr kullanır).',
    parameters: 'aranacak_metin',
    execute: (text: string) => {
      try {
        const output = execSync(`findstr /s /i /n /c:"${text}" *.*`, { encoding: 'utf8' });
        return output || 'Eşleşme bulunamadı.';
      } catch (error: any) {
        return `Hata: ${error.message}`;
      }
    }
  },
  {
    name: 'fetch_url',
    description: 'Bir web sayfasının içeriğini metin olarak çeker. Örn: fetch_url https://raw.githubusercontent.com/...',
    parameters: 'url',
    execute: (url: string) => {
      // Not: Senkron exec kullanarak curl ile data çekmek en kolayı (Bun + Windows için)
      try {
        const output = execSync(`curl -sL ${url}`, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
        // HTML etiketlerini kabaca temizleyelim
        const cleanText = output.replace(/<[^>]*>?/gm, '').slice(0, 5000); // İlk 5k karakteri alalım
        return cleanText || 'Sayfa içeriği boş veya alınamadı.';
      } catch (error: any) {
        return `Hata: ${error.message}`;
      }
    }
  }
];
