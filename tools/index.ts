import type { Tool } from '../types';
import type { SessionState } from '../state';
import { createShellTool } from './shell';
import { createReadTool } from './read';
import { createWriteTool } from './write';
import { createEditTool } from './edit';
import { createGrepTool } from './grep';
import { createGlobTool } from './glob';
import { createTodoTool } from './todo';
import {
  createFetchUrlTool,
  createNewsTool,
  createSearchTool,
} from './web';

export function createToolRegistry(state: SessionState): Tool[] {
  const cwd = state.cwd;
  return [
    createShellTool(cwd),
    createReadTool(cwd, state),
    createWriteTool(cwd, state),
    createEditTool(cwd, state),
    createGrepTool(cwd),
    createGlobTool(cwd),
    createTodoTool(state),
    createFetchUrlTool(),
    createNewsTool(),
    createSearchTool(),
  ];
}

export function findTool(tools: Tool[], name: string): Tool | undefined {
  return tools.find((t) => t.name === name);
}

/** Back-compat: default tools array without session (limited edit enforcement) */
export { createShellTool, createReadTool, createWriteTool, createEditTool };
