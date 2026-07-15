# Mini-Meta CLI v2.0

**Local-first agentic CLI** — Ollama üzerinde çalışan, sıfırdan yazılmış hafif bir kodlama ajanı.

## Ne değişti? (v1.5 → v2.0)

Modüler bir mimariye geçildi ve araç seti genişletildi:

| Alan | Mini-Meta |
| :--- | :--- |
| Ajan döngüsü | `engine.ts` Think-Act-Observe döngüsü |
| Dosya okuma | `read_file` → `N→satır` formatı, offset/limit |
| Dosya düzenleme | `edit_file` — exact old/new string, tırnak normalizasyonu, replace_all |
| Arama | `grep`, `glob` (ripgrep + fallback) |
| Görev takibi | `todo_write` oturum listesi |
| Shell güvenliği | `permissions.ts` yıkıcı komut engeli |
| Konuşma geçmişi | `history.ts` sliding window |
| System prompt | `prompt.ts` dinamik araç belgeleri |

### Mimari

```
mini-meta-cli/
  index.ts          # REPL girişi
  engine.ts         # Ajan döngüsü
  ollama.ts         # LLM istemcisi (fetch)
  parser.ts         # XML <tool_call> parser
  prompt.ts         # System prompt
  history.ts        # Mesaj geçmişi
  permissions.ts    # Shell guard
  state.ts          # Todos + okunan dosyalar
  types.ts
  tools/
    shell.ts read.ts write.ts edit.ts
    grep.ts glob.ts todo.ts web.ts
    index.ts
```

## Araçlar

| Araç | Açıklama |
| :--- | :--- |
| `shell` | Windows CMD/PS (yıkıcı komutlar engelli) |
| `read_file` | Satır numaralı okuma, offset/limit |
| `write_file` | Oluştur / üzerine yaz |
| `edit_file` | Exact replace (`---OLD---` / `---NEW---`) |
| `grep` | Regex arama (rg veya fallback) |
| `glob` | Dosya deseni (`**/*.ts`) |
| `todo_write` | Çok adımlı görev takibi |
| `fetch_url` | HTML → temiz metin |
| `get_news` | TRT RSS (sondakika/dunya/ekonomi) |
| `search` | Web arama |

## Kurulum

1. [Ollama](https://ollama.com/) — örn. `qwen2.5:7b`, `gemma2:9b`
2. [Bun](https://bun.sh/)

```bash
cd mobile/mini-meta-cli
bun run index.ts
# veya
bun run start -- --model=qwen2.5:7b
```

Ortam değişkenleri:

- `MINI_META_MODEL` — varsayılan model
- `OLLAMA_HOST` — örn. `http://localhost:11434`

## Kullanım

```
❯ bu klasördeki TypeScript dosyalarını bul
❯ engine.ts process metodunu oku ve özetle
❯ my-web-site içinde landing page yap
❯ ekonomi haberlerini economy_report.txt'ye kaydet
```

REPL komutları: `exit` · `clear` · `todos` · `help`

## Protokol

Yerel modeller için JSON tool-calling yerine Claude tarzı XML:

```xml
<tool_call name="read_file" path="engine.ts" />
<tool_call name="edit_file" path="app.ts">
---OLD---
const x = 1;
---NEW---
const x = 2;
</tool_call>
<tool_call name="shell">dir /b</tool_call>
```

Bittiğinde: `<done>`

## Notlar

- **Edit öncesi read zorunlu** — model önce dosyayı görmeden düzenleyemez.
- Context window için few-shot + son N mesaj gönderilir.
- axios kaldırıldı; Ollama `fetch` ile konuşur (Bun native).

---
*Local LLM'ler için optimize edilmiş, hafif bir agentic CLI.*
