# 🌌 Mini-Meta CLI (v1.5)

**A local-first, lightweight agentic CLI powered by Ollama, inspired by the reasoning DNA of Claude Code.**

Mini-Meta is an autonomous agent designed to run entirely on your local machine. It leverages the power of open-source models (like Qwen 2.5/3.5) to navigate your file system, execute shell commands, and conduct internet research without any external API dependencies.

## 🚀 Key Features

- **Autonomous Reasoning:** Uses a "Think-Act-Refine" loop to complete complex tasks.
- **Battle-Hardened Protocol:** Uses a Claude-style XML tagging system instead of fragile JSON, making it extremely resilient to formatting errors during code generation.
- **Smart Scraper & News:** 
  - `get_news`: Bypasses bot detection using RSS feeds (TRT Haber, World, Economy).
  - `fetch_url`: Smart HTML cleaning to extract only meaningful article text.
- **Local Sovereignty:** 100% offline. No API keys, no data harvesting.
- **Windows Optimized:** Built specifically for PowerShell/CMD environments.

## 🛠️ Tool Suite

| Tool | Description |
| :--- | :--- |
| `shell` | Execute Windows commands (CMD/PS). |
| `write_file` | Create or overwrite files with recursive directory creation. |
| `read_file` | Analyze existing code files. |
| `replace_file_content` | **Smart Replace** (Claude Style): Target specific blocks without rewriting the whole file. |
| `get_news` | Real-time news aggregation from trusted RSS sources. |
| `fetch_url` | Smart web scraping for research and technical docs. |
| `search` | General web searching for deep dives. |

## 🛠️ Installation

1. **Prerequisites:**
   - [Ollama](https://ollama.com/) (Recommended: `qwen2.5:7b` or `qwen3.5:4b`)
   - [Bun](https://bun.sh/) runtime.

2. **Setup:**
   ```bash
   git clone <repo-url>
   bun install
   ```

3. **Configure Model:**
   Open `ollama.ts` to set your model. For maximum speed, use 3B-7B models.

## 🎮 Usage

```bash
bun run index.ts
```

### Pro-Tips:
- "Build a modern landing page in `my-web-site` folder with HTML/CSS/JS."
- "Get the latest news about economy and save it to `economy_report.txt`."
- "Find all blue colors in `style.css` and change them to gold (#FFD700)."

## 🧬 Heritage
Mini-Meta was refactored from agentic logic found in advanced coding assistants, optimized for Bun/TS and local LLM performance. Built to be fast, private, and capable.

---
*Built for the hackers, by the hackers. 🦄🚀🦾*
