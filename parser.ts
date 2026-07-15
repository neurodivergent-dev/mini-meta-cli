/**
 * XML tool-call parser — resilient Claude-style protocol for local LLMs.
 * Supports attributes + body, nested param tags, and SEARCH/REPLACE blocks.
 */
import type { ParsedToolCall, ToolArgs } from './types';

/** Only pure template tokens — never real-looking values (e.g. dir /b is a valid command). */
const PLACEHOLDERS = new Set([
  'komut',
  'içerik',
  'içerik buraya',
  'aranacak metin',
  'aranan kelime',
  'url',
  'sorgu',
  'arama sorgusu',
  'kategori',
  'dosya_yolu',
  'yol',
  'path/to/file',
  'old_string',
  'new_string',
  'YOUR_PATH',
  'YOUR_COMMAND',
  '...',
]);

const ATTR_KEYS = [
  'name',
  'path',
  'filename',
  'file_path',
  'command',
  'query',
  'url',
  'text',
  'pattern',
  'category',
  'offset',
  'limit',
  'glob',
  'replace_all',
  'old_string',
  'new_string',
] as const;

/** Primary pattern: <tool_call ...attrs...>optional body</tool_call> or self-closing */
const TOOL_PATTERN =
  /<tool_call\s+([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/tool_call>)/gi;

function parseAttributes(attrStr: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_][\w]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrStr)) !== null) {
    out[m[1]] = m[2] ?? m[3] ?? '';
  }
  return out;
}

function parseBodyParams(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  // <path>...</path> style
  const tagRe = /<([a-zA-Z_][\w]*)>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(body)) !== null) {
    out[m[1]] = m[2].trim();
  }

  // SEARCH_BLOCK / REPLACE_BLOCK (legacy Mini-Meta)
  if (body.includes('SEARCH_BLOCK') || body.includes('REPLACE_BLOCK')) {
    const parts = body.split(/REPLACE_BLOCK/i);
    if (parts.length >= 2) {
      out.old_string = parts[0].replace(/SEARCH_BLOCK/i, '').trim();
      out.new_string = parts[1].trim();
    }
  }

  // ---OLD--- / ---NEW--- delimiter style
  if (body.includes('---OLD---') && body.includes('---NEW---')) {
    const afterOld = body.split('---OLD---')[1] ?? '';
    const [oldPart, newPart] = afterOld.split('---NEW---');
    if (oldPart !== undefined) out.old_string = oldPart.trim();
    if (newPart !== undefined) out.new_string = newPart.trim();
  }

  // old_string: ... new_string: ... line form
  const oldMatch = body.match(/old_string:\s*([\s\S]*?)(?=\nnew_string:|$)/i);
  const newMatch = body.match(/new_string:\s*([\s\S]*?)$/i);
  if (oldMatch) out.old_string = oldMatch[1].trim();
  if (newMatch) out.new_string = newMatch[1].trim();

  return out;
}

function toArgs(
  name: string,
  attrs: Record<string, string>,
  body: string,
  bodyParams: Record<string, string>,
): ToolArgs {
  const path =
    attrs.path ||
    attrs.filename ||
    attrs.file_path ||
    bodyParams.path ||
    bodyParams.file_path ||
    bodyParams.filename;

  const args: ToolArgs = { ...bodyParams };

  if (path) args.path = path;

  // Map common attrs
  for (const key of ATTR_KEYS) {
    if (key === 'name') continue;
    const v = attrs[key];
    if (v === undefined || v === '') continue;
    if (key === 'filename' || key === 'file_path') {
      args.path = v;
    } else if (key === 'offset' || key === 'limit') {
      args[key] = parseInt(v, 10);
    } else if (key === 'replace_all') {
      args.replace_all = v === 'true' || v === '1';
    } else {
      args[key] = v;
    }
  }

  // Body as primary payload for shell / write / search content tools
  const trimmedBody = body.trim();
  if (trimmedBody && !trimmedBody.includes('<') && !args.old_string) {
    if (name === 'shell' || name === 'bash') {
      args.command = args.command || trimmedBody;
    } else if (name === 'write_file' || name === 'write') {
      args.content = args.content || trimmedBody;
    } else if (name === 'search' || name === 'web_search') {
      args.query = args.query || trimmedBody;
    } else if (name === 'fetch_url' || name === 'webfetch') {
      args.url = args.url || trimmedBody;
    } else if (name === 'grep' || name === 'grep_files') {
      args.pattern = args.pattern || args.text || trimmedBody;
      args.text = args.text || trimmedBody;
    } else if (name === 'glob') {
      args.pattern = args.pattern || trimmedBody;
    } else if (name === 'get_news') {
      args.category = args.category || trimmedBody;
    } else if (!args.content && !args.command && !args.query) {
      args.content = trimmedBody;
    }
  } else if (trimmedBody && name === 'write_file') {
    // Body may be full file content even with markdown
    if (!args.content) args.content = trimmedBody;
  } else if (trimmedBody && (name === 'shell' || name === 'bash') && !args.command) {
    args.command = trimmedBody;
  }

  // Shell: command attr or body
  if ((name === 'shell' || name === 'bash') && attrs.command) {
    args.command = attrs.command;
  }

  return args;
}

function isPlaceholder(call: ParsedToolCall): boolean {
  const values = [
    call.args.path,
    call.args.command,
    call.args.query,
    call.args.url,
    call.args.text,
    call.args.pattern,
    call.args.content,
    call.args.category,
    call.args.old_string,
    call.args.new_string,
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase().trim());

  return values.some((v) => PLACEHOLDERS.has(v));
}

const ALIASES: Record<string, string> = {
  read: 'read_file',
  Read: 'read_file',
  write: 'write_file',
  Write: 'write_file',
  edit: 'edit_file',
  Edit: 'edit_file',
  replace: 'edit_file',
  replace_file_content: 'edit_file',
  str_replace: 'edit_file',
  bash: 'shell',
  Bash: 'shell',
  Grep: 'grep',
  grep_files: 'grep',
  Glob: 'glob',
  TodoWrite: 'todo_write',
  WebFetch: 'fetch_url',
  WebSearch: 'search',
};

export function normalizeToolName(name: string): string {
  return ALIASES[name] || name;
}

export function parseToolCalls(content: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  TOOL_PATTERN.lastIndex = 0;

  for (const match of content.matchAll(TOOL_PATTERN)) {
    const attrStr = match[1] ?? '';
    const body = match[2] ?? '';
    const attrs = parseAttributes(attrStr);
    const rawName = attrs.name;
    if (!rawName) continue;

    const name = normalizeToolName(rawName);
    const bodyParams = parseBodyParams(body);
    const args = toArgs(name, attrs, body, bodyParams);

    const call: ParsedToolCall = { name, args, raw: match[0] };
    if (!isPlaceholder(call)) {
      calls.push(call);
    }
  }

  return calls;
}

/** Strip tool_call tags for display as assistant text */
export function stripToolCalls(content: string): string {
  return content
    .replace(TOOL_PATTERN, '')
    .replace(/<\/?done>/gi, '')
    .trim();
}

export function hasDoneMarker(content: string): boolean {
  return /<done\s*\/?>/i.test(content) || /<\/done>/i.test(content);
}
