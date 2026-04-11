# 🌌 Mini-Meta CLI

**A local-first, lightweight agentic CLI powered by Ollama, extracted from the core reasoning DNA of Claude Code.**

Mini-Meta is an autonomous agent designed to run entirely on your local machine. It leverages the power of open-source models (like Qwen 2.5 and Llama 3) to navigate your file system, execute shell commands, and write code without any external API dependencies.

## 🚀 Features

- **Autonomous Reasoning:** Uses a "Think-Act-Refine" loop to complete complex tasks.
- **Local Sovereignty:** 100% offline. No API keys, no data harvesting, no subscriptions.
- **Windows Optimized:** Built specifically to handle Windows Shell (PowerShell/CMD) and file paths.
- **Tool Suite:**
  - `shell`: Execute any Windows command.
  - `write_file`: Create or overwrite files with automatic content normalization.
  - `read_file`: Analyze existing code files.
  - `grep_files`: Search for patterns across your entire project.
  - `fetch_url`: Pull content from the web for RAG-like capabilities.

## 🛠️ Installation

1. **Prerequisites:**
   - [Ollama](https://ollama.com/) installed and running.
   - [Bun](https://bun.sh/) runtime.

2. **Setup:**
   ```bash
   cd mini-tengu
   bun add axios
   ```

3. **Configure Model:**
   Open `ollama.ts` and set your preferred local model:
   ```typescript
   private model = 'qwen2.5:14b'; // or llama3.1:8b
   ```

## 🎮 Usage

Run the agent:
```bash
bun run index.ts
```

### Example Commands:
- "Create a python script named `calc.py` that handles basic math and run it."
- "Search for all occurrences of 'API_KEY' in this directory."
- "Read the content of `https://example.com` and summarize it."

## 🧬 Heritage
Mini-Meta was born from a surgical extraction of the agentic logic found within a Claude Code snapshot, refactored into a clean, modern, and independent TypeScript architecture.

---
*Built for the hackers, by the hackers. 🦄🚀🦾*
