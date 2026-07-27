import { tool } from 'ai';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

const WORKSPACE = process.env.WORKSPACE_PATH || '/workspace';

function resolveSafe(filePath: string): string {
  const resolved = path.resolve(WORKSPACE, filePath);
  if (!resolved.startsWith(WORKSPACE)) {
    throw new Error('Path traversal not allowed');
  }
  return resolved;
}

export const readFileTool = tool({
  description: 'Read the contents of a file at the given path within the workspace',
  parameters: z.object({
    path: z.string().describe('Relative path from workspace root'),
    offset: z.number().optional().describe('Line number to start from (0-indexed)'),
    limit: z.number().optional().describe('Max number of lines to read'),
  }),
  execute: async ({ path: filePath, offset, limit }) => {
    const abs = resolveSafe(filePath);
    const content = await fs.readFile(abs, 'utf-8');
    const lines = content.split('\n');
    const start = offset || 0;
    const end = limit ? start + limit : lines.length;
    const sliced = lines.slice(start, end);
    return {
      path: filePath,
      totalLines: lines.length,
      offset: start,
      returnedLines: sliced.length,
      content: sliced.join('\n'),
    };
  },
});

export const writeFileTool = tool({
  description: 'Write content to a file. Creates the file if it does not exist, or overwrites if it does. For destructive overwrites, confirmation is required.',
  parameters: z.object({
    path: z.string().describe('Relative path from workspace root'),
    content: z.string().describe('The full content to write to the file'),
  }),
  execute: async ({ path: filePath, content }) => {
    const abs = resolveSafe(filePath);
    let existingContent = '';
    try {
      existingContent = await fs.readFile(abs, 'utf-8');
    } catch {
      // File does not exist yet — that's fine
    }
    const dir = path.dirname(abs);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(abs, content, 'utf-8');
    return {
      path: filePath,
      created: existingContent === '',
      bytesWritten: Buffer.byteLength(content, 'utf-8'),
    };
  },
});

export const editFileTool = tool({
  description: 'Apply a search-and-replace edit to a file. The oldText must match exactly (including whitespace). Use this for targeted edits rather than rewriting entire files.',
  parameters: z.object({
    path: z.string().describe('Relative path from workspace root'),
    oldText: z.string().describe('The exact text to find and replace'),
    newText: z.string().describe('The text to replace it with'),
  }),
  execute: async ({ path: filePath, oldText, newText }) => {
    const abs = resolveSafe(filePath);
    const content = await fs.readFile(abs, 'utf-8');
    if (!content.includes(oldText)) {
      return { error: 'oldText not found in file. Make sure it matches exactly.' };
    }
    const updated = content.replace(oldText, newText);
    await fs.writeFile(abs, updated, 'utf-8');
    return {
      path: filePath,
      edits: content.split(oldText).length - 1,
    };
  },
});

export const createFileTool = tool({
  description: 'Create a new file with the given content. Fails if the file already exists.',
  parameters: z.object({
    path: z.string().describe('Relative path from workspace root'),
    content: z.string().describe('The content for the new file'),
  }),
  execute: async ({ path: filePath, content }) => {
    const abs = resolveSafe(filePath);
    try {
      await fs.access(abs);
      return { error: 'File already exists. Use writeFile to overwrite or editFile to modify.' };
    } catch {
      // File doesn't exist — good
    }
    const dir = path.dirname(abs);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(abs, content, 'utf-8');
    return {
      path: filePath,
      created: true,
      bytesWritten: Buffer.byteLength(content, 'utf-8'),
    };
  },
});

export const deleteFileTool = tool({
  description: 'Delete a file at the given path. This is a destructive operation.',
  parameters: z.object({
    path: z.string().describe('Relative path from workspace root'),
  }),
  execute: async ({ path: filePath }) => {
    const abs = resolveSafe(filePath);
    await fs.unlink(abs);
    return { path: filePath, deleted: true };
  },
});

export const renameFileTool = tool({
  description: 'Rename or move a file from one path to another within the workspace.',
  parameters: z.object({
    from: z.string().describe('Current relative path'),
    to: z.string().describe('New relative path'),
  }),
  execute: async ({ from, to }) => {
    const absFrom = resolveSafe(from);
    const absTo = resolveSafe(to);
    const dir = path.dirname(absTo);
    await fs.mkdir(dir, { recursive: true });
    await fs.rename(absFrom, absTo);
    return { from, to, renamed: true };
  },
});

export const listDirectoryTool = tool({
  description: 'List files and directories at the given path within the workspace',
  parameters: z.object({
    path: z.string().optional().describe('Relative directory path (default: workspace root)'),
    recursive: z.boolean().optional().describe('List recursively (default: false)'),
  }),
  execute: async ({ path: dirPath, recursive }) => {
    const abs = dirPath ? resolveSafe(dirPath) : WORKSPACE;
    if (recursive) {
      const entries: string[] = [];
      async function walk(dir: string, prefix: string) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist') continue;
          const rel = prefix ? `${prefix}/${item.name}` : item.name;
          entries.push(rel);
          if (item.isDirectory()) {
            await walk(path.join(dir, item.name), rel);
          }
        }
      }
      await walk(abs, '');
      return { path: dirPath || '.', entries: entries.slice(0, 500) };
    }
    const items = await fs.readdir(abs, { withFileTypes: true });
    const entries = items.map(i => ({
      name: i.name,
      type: i.isDirectory() ? 'directory' as const : 'file' as const,
    }));
    return { path: dirPath || '.', entries };
  },
});
