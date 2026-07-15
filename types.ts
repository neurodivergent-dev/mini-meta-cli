/** Core types for Mini-Meta CLI */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: Role;
  content: string;
}

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface TodoItem {
  id: string;
  content: string;
  activeForm: string;
  status: TodoStatus;
}

export interface ToolArgs {
  path?: string;
  content?: string;
  command?: string;
  query?: string;
  url?: string;
  text?: string;
  pattern?: string;
  category?: string;
  offset?: number;
  limit?: number;
  old_string?: string;
  new_string?: string;
  replace_all?: boolean;
  glob?: string;
  todos?: TodoItem[];
  [key: string]: unknown;
}

export interface ToolResult {
  ok: boolean;
  output: string;
}

export interface Tool {
  name: string;
  description: string;
  /** Short usage hint shown in system prompt */
  usage: string;
  /** Read-only tools can be batched together */
  isConcurrencySafe: boolean;
  execute: (args: ToolArgs) => string | Promise<string>;
}

export interface ParsedToolCall {
  name: string;
  args: ToolArgs;
  raw: string;
}

export interface EngineConfig {
  model?: string;
  maxIterations?: number;
  maxRecentMessages?: number;
  cwd?: string;
  /** Auto-approve shell (still blocks destructive patterns) */
  autoApproveShell?: boolean;
}
