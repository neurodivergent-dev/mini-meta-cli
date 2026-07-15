/**
 * Back-compat re-export. Prefer tools/index.ts + SessionState for new code.
 */
import { SessionState } from './state';
import { createToolRegistry } from './tools/index';
import type { Tool } from './types';

const defaultState = new SessionState(process.cwd());
export const tools: Tool[] = createToolRegistry(defaultState);
export type { Tool } from './types';
