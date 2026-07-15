/**
 * Session state: todos + files read (for edit-before-read enforcement).
 */
import type { TodoItem } from './types';

export class SessionState {
  private todos: TodoItem[] = [];
  private filesRead = new Set<string>();
  readonly cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  markRead(filePath: string): void {
    this.filesRead.add(normalizePath(filePath));
  }

  wasRead(filePath: string): boolean {
    return this.filesRead.has(normalizePath(filePath));
  }

  setTodos(items: TodoItem[]): string {
    this.todos = items.map((t, i) => ({
      id: t.id || String(i + 1),
      content: t.content,
      activeForm: t.activeForm || t.content,
      status: t.status || 'pending',
    }));
    return this.formatTodos();
  }

  getTodos(): TodoItem[] {
    return [...this.todos];
  }

  formatTodos(): string {
    if (this.todos.length === 0) return 'Todo listesi boş.';
    return this.todos
      .map((t) => {
        const icon =
          t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '→' : '○';
        return `${icon} [${t.status}] ${t.content}`;
      })
      .join('\n');
  }
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase();
}
