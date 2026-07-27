import { tool } from 'ai';
import { z } from 'zod';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const WORKSPACE = process.env.WORKSPACE_PATH || '/workspace';

export const searchFilesTool = tool({
  description: 'Search for files matching a glob pattern within the workspace',
  parameters: z.object({
    pattern: z.string().describe('Glob pattern (e.g., "**/*.tsx", "src/**/*.ts")'),
    exclude: z.array(z.string()).optional().describe('Patterns to exclude'),
  }),
  execute: async ({ pattern, exclude }) => {
    const ignore = ['**/node_modules/**', '**/.git/**', '**/dist/**', ...(exclude || [])];
    const files = await glob(pattern, { cwd: WORKSPACE, ignore, nodir: true });
    return { files: files.slice(0, 200), total: files.length };
  },
});

export const searchCodeTool = tool({
  description: 'Search file contents using ripgrep/grep for a regex or literal pattern',
  parameters: z.object({
    query: z.string().describe('Search pattern (regex supported)'),
    include: z.string().optional().describe('File pattern to search in (e.g., "*.ts", "*.tsx")'),
    maxResults: z.number().optional().describe('Max results to return (default: 50)'),
  }),
  execute: async ({ query, include, maxResults }) => {
    const max = maxResults || 50;
    try {
      let cmd = `rg -n --no-heading --max-count=${max}`;
      if (include) cmd += ` -g '${include}'`;
      cmd += ` "${query.replace(/"/g, '\\"')}" .`;
      const output = execSync(cmd, {
        cwd: WORKSPACE,
        encoding: 'utf-8',
        timeout: 15000,
        maxBuffer: 1024 * 1024,
      });
      const lines = output.split('\n').filter(Boolean).slice(0, max);
      return { results: lines, total: lines.length };
    } catch {
      // Fallback: try grep
      try {
        let cmd = `grep -rn --include='${include || '*'}' "${query.replace(/"/g, '\\"')}" .`;
        const output = execSync(cmd, {
          cwd: WORKSPACE,
          encoding: 'utf-8',
          timeout: 15000,
        });
        const lines = output.split('\n').filter(Boolean).slice(0, max);
        return { results: lines, total: lines.length };
      } catch {
        return { results: [], total: 0, error: 'No matches found or search failed' };
      }
    }
  },
});

export const getProjectInfoTool = tool({
  description: 'Get an overview of the project structure: key config files, directory layout, and dependencies',
  parameters: z.object({}),
  execute: async () => {
    const info: Record<string, any> = {};

    // Read package.json
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(WORKSPACE, 'package.json'), 'utf-8'));
      info.packageJson = {
        name: pkg.name,
        scripts: Object.keys(pkg.scripts || {}),
        dependencies: Object.keys(pkg.dependencies || {}),
        devDependencies: Object.keys(pkg.devDependencies || {}),
      };
    } catch { /* no package.json */ }

    // Read tsconfig
    try {
      const tsconfig = JSON.parse(await fs.readFile(path.join(WORKSPACE, 'tsconfig.json'), 'utf-8'));
      info.tsconfig = { target: tsconfig.compilerOptions?.target, jsx: tsconfig.compilerOptions?.jsx };
    } catch { /* no tsconfig */ }

    // Directory structure (top 2 levels)
    try {
      const output = execSync('find . -maxdepth 2 -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" | head -100', {
        cwd: WORKSPACE,
        encoding: 'utf-8',
        timeout: 5000,
      });
      info.topFiles = output.split('\n').filter(Boolean);
    } catch { /* fallback */ }

    return info;
  },
});
