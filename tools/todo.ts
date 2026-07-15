import type { Tool, TodoItem } from '../types';
import type { SessionState } from '../state';

export function createTodoTool(state: SessionState): Tool {
  return {
    name: 'todo_write',
    description:
      'Oturum todo listesini günceller. 3+ adımlı işlerde kullan. Aynı anda tek in_progress. Her item: id, content, activeForm, status.',
    usage:
      '<tool_call name="todo_write">[{"id":"1","content":"X yap","activeForm":"X yapılıyor","status":"in_progress"}]</tool_call>',
    isConcurrencySafe: false,
    execute: (args) => {
      try {
        let items: TodoItem[] = [];

        if (Array.isArray(args.todos)) {
          items = args.todos as TodoItem[];
        } else {
          const raw = String(args.content || args.text || '').trim();
          if (!raw) return "Hata: todo JSON dizisi gerekli.";
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            return 'Hata: todos bir dizi olmalı.';
          }
          items = parsed;
        }

        const inProgress = items.filter((t) => t.status === 'in_progress');
        if (inProgress.length > 1) {
          return 'Hata: Aynı anda yalnızca bir task in_progress olabilir.';
        }

        const formatted = state.setTodos(items);
        console.log(`\x1b[36m[Todos]\n${formatted}\x1b[0m`);
        return `Todo güncellendi:\n${formatted}`;
      } catch (error: unknown) {
        return `Hata: ${(error as Error).message}`;
      }
    },
  };
}
