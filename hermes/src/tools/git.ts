import { tool } from 'ai';
import { z } from 'zod';
import { execSync } from 'child_process';

const WORKSPACE = process.env.WORKSPACE_PATH || '/workspace';

function git(args: string): string {
  try {
    return execSync(`git ${args}`, {
      cwd: WORKSPACE,
      encoding: 'utf-8',
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    });
  } catch (err: any) {
    return err.stderr || err.message || 'Git command failed';
  }
}

export const gitStatusTool = tool({
  description: 'Show the working tree status (modified, staged, untracked files)',
  parameters: z.object({}),
  execute: async () => {
    const status = git('status --porcelain');
    const branch = git('branch --show-current').trim();
    const files = status.split('\n').filter(Boolean).map(line => {
      const indexStatus = line[0];
      const workStatus = line[1];
      const filePath = line.slice(3);
      return {
        path: filePath,
        indexStatus,
        workStatus,
        status: indexStatus === '?' ? 'untracked' :
          indexStatus === 'A' ? 'added' :
          indexStatus === 'D' ? 'deleted' :
          indexStatus === 'R' ? 'renamed' :
          workStatus === 'M' ? 'modified' : 'unknown',
      };
    });
    return { branch, files, totalFiles: files.length };
  },
});

export const gitDiffTool = tool({
  description: 'Show changes in the working tree, optionally for a specific file or between commits',
  parameters: z.object({
    file: z.string().optional().describe('Specific file to diff'),
    staged: z.boolean().optional().describe('Show staged changes (default: unstaged)'),
    commit: z.string().optional().describe('Diff against a specific commit'),
  }),
  execute: async ({ file, staged, commit }) => {
    let cmd = 'diff';
    if (staged) cmd += ' --staged';
    if (commit) cmd += ` ${commit}`;
    if (file) cmd += ` -- ${file}`;
    const output = git(cmd);
    return { diff: output.slice(0, 20000), file: file || 'all' };
  },
});

export const gitAddTool = tool({
  description: 'Stage files for the next commit',
  parameters: z.object({
    files: z.array(z.string()).describe('Array of file paths to stage, or ["."] for all'),
  }),
  execute: async ({ files }) => {
    const fileArgs = files.join(' ');
    const output = git(`add ${fileArgs}`);
    return { staged: files, output: output.trim() || 'Files staged successfully' };
  },
});

export const gitCommitTool = tool({
  description: 'Create a new commit with the staged changes',
  parameters: z.object({
    message: z.string().describe('The commit message'),
  }),
  execute: async ({ message }) => {
    const escaped = message.replace(/"/g, '\\"');
    const output = git(`commit -m "${escaped}"`);
    return { message, output: output.slice(0, 5000) };
  },
});

export const gitLogTool = tool({
  description: 'Show recent commit history',
  parameters: z.object({
    count: z.number().optional().describe('Number of commits to show (default: 10)'),
  }),
  execute: async ({ count }) => {
    const n = count || 10;
    const output = git(`log --oneline -${n}`);
    return { log: output.trim(), count: n };
  },
});
