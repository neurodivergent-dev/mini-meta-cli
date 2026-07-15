/**
 * Sliding-window message history with a fixed few-shot anchor.
 * Keeps token usage bounded by dropping the oldest conversation turns.
 */
import type { Message } from './types';

export class MessageHistory {
  private messages: Message[] = [];
  private fewShotCount = 0;

  constructor(
    private maxRecent = 12,
    private maxTotal = 40,
  ) {}

  setSystemAndFewShot(system: Message, fewShot: Message[]): void {
    this.messages = [system, ...fewShot];
    this.fewShotCount = this.messages.length;
  }

  push(msg: Message): void {
    this.messages.push(msg);
    this.trim();
  }

  /** Messages to send to the model: system + few-shot + recent turns */
  forApi(): Message[] {
    if (this.messages.length <= this.fewShotCount + this.maxRecent) {
      return [...this.messages];
    }
    const anchor = this.messages.slice(0, this.fewShotCount);
    const recent = this.messages.slice(-this.maxRecent);
    return [...anchor, ...recent];
  }

  all(): Message[] {
    return [...this.messages];
  }

  clearConversation(): void {
    this.messages = this.messages.slice(0, this.fewShotCount);
  }

  get length(): number {
    return this.messages.length;
  }

  private trim(): void {
    if (this.messages.length <= this.maxTotal) return;
    // Keep system+few-shot, drop oldest conversation messages
    const overflow = this.messages.length - this.maxTotal;
    const dropFrom = this.fewShotCount;
    this.messages.splice(dropFrom, overflow);
  }
}
