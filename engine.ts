/**
 * Mini-Meta agent loop.
 * Think → Act (tools) → Observe → Refine until <done> or max iterations.
 */
import React from 'react';
import { render } from 'ink';
import { OllamaClient } from './ollama';
import { MessageHistory } from './history';
import { SessionState } from './state';
import { createToolRegistry, findTool } from './tools/index';
import {
  parseToolCalls,
  stripToolCalls,
  hasDoneMarker,
} from './parser';
import {
  buildSystemPrompt,
  buildFewShotMessages,
  toolResultFeedback,
} from './prompt';
import type { EngineConfig, Tool } from './types';
import { MiniTenguOrchestrator } from './tui';

interface TUIState {
  step: number;
  status: string;
  isComplete: boolean;
}

export class MiniTenguEngine {
  private client: OllamaClient;
  private history: MessageHistory;
  private state: SessionState;
  private tools: Tool[];
  private maxIterations: number;
  private tuiState: TUIState;
  private tuiInstance: ReturnType<typeof render> | null = null;

  constructor(config: EngineConfig | string = {}) {
    // Back-compat: constructor(model?: string)
    const cfg: EngineConfig =
      typeof config === 'string' ? { model: config } : config;

    const cwd = cfg.cwd || process.cwd();
    this.client = new OllamaClient(cfg.model);
    this.history = new MessageHistory(cfg.maxRecentMessages ?? 12);
    this.state = new SessionState(cwd);
    this.tools = createToolRegistry(this.state);
    this.maxIterations = cfg.maxIterations ?? 15;

    this.tuiState = {
      step: 0,
      status: 'Başlatılıyor...',
      isComplete: false,
    };

    const systemContent = buildSystemPrompt(this.tools, cwd);
    const fewShot = buildFewShotMessages();
    this.history.setSystemAndFewShot(
      { role: 'system', content: systemContent },
      fewShot,
    );
  }

  private updateTUI(step: number, status: string): void {
    this.tuiState.step = step;
    this.tuiState.status = status;

    if (this.tuiInstance) {
      this.tuiInstance.rerender(
        React.createElement(MiniTenguOrchestrator, {
          step: this.tuiState.step,
          status: this.tuiState.status,
          isComplete: this.tuiState.isComplete,
        }),
      );
    } else {
      this.tuiInstance = render(
        React.createElement(MiniTenguOrchestrator, {
          step: this.tuiState.step,
          status: this.tuiState.status,
          isComplete: this.tuiState.isComplete,
        }),
      );
    }
  }

  private unmountTUI(): void {
    if (this.tuiInstance) {
      this.tuiInstance.unmount();
      this.tuiInstance = null;
    }
  }

  get modelName(): string {
    return this.client.modelName;
  }

  get todos(): string {
    return this.state.formatTodos();
  }

  clearHistory(): void {
    this.history.clearConversation();
  }

  async process(userInput: string): Promise<string> {
    this.history.push({ role: 'user', content: userInput });
    this.updateTUI(1, 'İstek işleniyor...');

    let iterations = 0;
    let consecutiveErrors = 0;
    let lastAssistant = '';

    while (iterations < this.maxIterations) {
      this.updateTUI(iterations + 1, `Düşünüyor... (${iterations + 1}/${this.maxIterations})`);
      console.log(`\x1b[36m[Mini-Meta] Düşünüyor... (${iterations + 1}/${this.maxIterations})\x1b[0m`);

      try {
        const response = await this.client.chat(this.history.forApi());
        consecutiveErrors = 0;
        const content = response.content?.trim() || '';

        if (!content) {
          this.history.push({
            role: 'user',
            content: 'Hata: Yanıt boştu. Araç çağır veya <done> yaz.',
          });
          iterations++;
          continue;
        }

        lastAssistant = content;
        const assistantText = stripToolCalls(content);
        if (assistantText) {
          console.log(`\x1b[35m[Ajan]:\x1b[0m ${assistantText}`);
        }

        this.history.push({ role: 'assistant', content });

        const calls = parseToolCalls(content);
        if (calls.length > 0) {
          const results: { name: string; output: string }[] = [];

          // Partition: run concurrency-safe tools first in parallel, then serial
          const safe = calls.filter((c) => {
            const t = findTool(this.tools, c.name);
            return t?.isConcurrencySafe;
          });
          const unsafe = calls.filter((c) => {
            const t = findTool(this.tools, c.name);
            return t && !t.isConcurrencySafe;
          });
          const unknown = calls.filter((c) => !findTool(this.tools, c.name));

          for (const call of unknown) {
            results.push({
              name: call.name,
              output: `Bilinmeyen araç: ${call.name}. Kullanılabilir: ${this.tools.map((t) => t.name).join(', ')}`,
            });
          }

          // Parallel batch for read-only
          if (safe.length > 0) {
            const parallel = await Promise.all(
              safe.map(async (call) => {
                const tool = findTool(this.tools, call.name)!;
                console.log(
                  `\x1b[33m[Mini-Meta] EYLEM: ${tool.name} ${call.args.path || call.args.pattern || call.args.query || call.args.url || ''}\x1b[0m`,
                );
                const output = await Promise.resolve(tool.execute(call.args));
                return { name: tool.name, output };
              }),
            );
            results.push(...parallel);
          }

          // Serial for write/shell/edit
          for (const call of unsafe) {
            const tool = findTool(this.tools, call.name)!;
            console.log(
              `\x1b[33m[Mini-Meta] EYLEM: ${tool.name} ${call.args.path || call.args.command || ''}\x1b[0m`,
            );
            const output = await Promise.resolve(tool.execute(call.args));
            results.push({ name: tool.name, output });
          }

          if (results.length > 0) {
            const feedback = toolResultFeedback(results);
            // Preview short results
            for (const r of results) {
              const preview = r.output.slice(0, 200).replace(/\n/g, ' ');
              console.log(`\x1b[90m  ↳ ${r.name}: ${preview}${r.output.length > 200 ? '…' : ''}\x1b[0m`);
            }
            this.history.push({ role: 'user', content: feedback });
            iterations++;
            continue;
          }
        }

        if (hasDoneMarker(content)) {
          this.tuiState.isComplete = true;
          this.updateTUI(iterations + 1, 'Tamamlandı!');
          setTimeout(() => this.unmountTUI(), 500);
          return stripToolCalls(content).replace(/<done\s*\/?>/gi, '').trim();
        }

        // No tools and no done — treat as final answer
        this.tuiState.isComplete = true;
        this.updateTUI(iterations + 1, 'Tamamlandı!');
        setTimeout(() => this.unmountTUI(), 500);
        return assistantText || content;
      } catch (e: unknown) {
        consecutiveErrors++;
        const msg = (e as Error).message || String(e);
        const isTimeout = msg.includes('timeout');
        const isEOF = msg === 'EOF';
        const errorMsg = isTimeout ? 'Ollama zaman aşımı.' : isEOF ? "Model yüklenemedi (EOF)." : msg;
        console.log(
          `\x1b[31m[Hata] ${errorMsg}\x1b[0m`,
        );
        this.updateTUI(iterations + 1, `❌ Hata: ${errorMsg}`);

        if (consecutiveErrors >= 2) {
          console.log(
            `\x1b[31m[Mini-Meta] Ardışık ${consecutiveErrors} hata. Vazgeçiliyor.\x1b[0m`,
          );
          this.tuiState.isComplete = true;
          this.updateTUI(iterations + 1, '❌ Hata limiti aşıldı.');
          setTimeout(() => this.unmountTUI(), 500);
          return "Ollama bağlantı hatası. 'ollama serve' ve model adını kontrol edin.";
        }
        iterations++;
      }
    }

    this.tuiState.isComplete = true;
    this.updateTUI(this.maxIterations, 'İterasyon limiti aşıldı.');
    setTimeout(() => this.unmountTUI(), 500);

    return lastAssistant
      ? `Limit aşıldı. Son yanıt:\n${stripToolCalls(lastAssistant)}`
      : 'Limit aşıldı.';
  }
}
