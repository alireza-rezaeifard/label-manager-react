import { tool } from 'ai';
import { z } from 'zod';
import { execSync } from 'child_process';

const WORKSPACE = process.env.WORKSPACE_PATH || '/workspace';

function git(args: string, timeout?: number): string {
  try {
    return execSync(`git ${args}`, {
      cwd: WORKSPACE,
      encoding: 'utf-8',
      timeout: timeout || 15000,
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

export const gitBranchTool = tool({
  description: 'List all branches, or create/delete a branch',
  parameters: z.object({
    action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
    name: z.string().optional().describe('Branch name (required for create/delete)'),
  }),
  execute: async ({ action, name }) => {
    if (action === 'list') {
      const output = git('branch -a');
      return { branches: output.trim() };
    }
    if (action === 'create') {
      if (!name) return { error: 'Branch name is required' };
      const output = git(`branch ${name}`);
      return { created: name, output: output.trim() || `Branch '${name}' created` };
    }
    if (action === 'delete') {
      if (!name) return { error: 'Branch name is required' };
      const output = git(`branch -d ${name}`);
      return { deleted: name, output: output.trim() || `Branch '${name}' deleted` };
    }
    return { error: 'Invalid action' };
  },
});

export const gitCheckoutTool = tool({
  description: 'Switch to a branch or create a new branch and switch to it',
  parameters: z.object({
    branch: z.string().describe('Branch name to switch to'),
    create: z.boolean().optional().describe('Create the branch if it does not exist (default: false)'),
  }),
  execute: async ({ branch, create }) => {
    const flag = create ? '-b' : '';
    const output = git(`checkout ${flag} ${branch}`);
    return { switchedTo: branch, output: output.trim() };
  },
});

export const gitStashTool = tool({
  description: 'Stash, list, or pop stashed changes',
  parameters: z.object({
    action: z.enum(['save', 'list', 'pop', 'drop']).describe('Action to perform'),
    message: z.string().optional().describe('Stash message (for save action)'),
  }),
  execute: async ({ action, message }) => {
    if (action === 'save') {
      const msg = message ? ` -m "${message.replace(/"/g, '\\"')}"` : '';
      const output = git(`stash save${msg}`);
      return { action: 'save', output: output.trim() };
    }
    if (action === 'list') {
      const output = git('stash list');
      return { action: 'list', stashes: output.trim() || 'No stashes' };
    }
    if (action === 'pop') {
      const output = git('stash pop');
      return { action: 'pop', output: output.trim() };
    }
    if (action === 'drop') {
      const output = git('stash drop');
      return { action: 'drop', output: output.trim() };
    }
    return { error: 'Invalid action' };
  },
});

export const gitPushTool = tool({
  description: 'Push commits to a remote repository',
  parameters: z.object({
    remote: z.string().optional().describe('Remote name (default: origin)'),
    branch: z.string().optional().describe('Branch name (default: current branch)'),
    force: z.boolean().optional().describe('Force push (default: false)'),
  }),
  execute: async ({ remote, branch, force }) => {
    const r = remote || 'origin';
    const b = branch ? ` ${branch}` : '';
    const f = force ? ' --force' : '';
    const output = git(`push ${r}${b}${f}`, 30000);
    return { remote: r, branch: branch || 'current', output: output.trim() };
  },
});

export const gitPullTool = tool({
  description: 'Pull commits from a remote repository',
  parameters: z.object({
    remote: z.string().optional().describe('Remote name (default: origin)'),
    branch: z.string().optional().describe('Branch name (default: current branch)'),
  }),
  execute: async ({ remote, branch }) => {
    const r = remote || 'origin';
    const b = branch ? ` ${branch}` : '';
    const output = git(`pull ${r}${b}`, 30000);
    return { remote: r, branch: branch || 'current', output: output.trim() };
  },
});

export const gitRemoteTool = tool({
  description: 'List, add, or remove git remotes',
  parameters: z.object({
    action: z.enum(['list', 'add', 'remove']).describe('Action to perform'),
    name: z.string().optional().describe('Remote name (for add/remove)'),
    url: z.string().optional().describe('Remote URL (for add)'),
  }),
  execute: async ({ action, name, url }) => {
    if (action === 'list') {
      const output = git('remote -v');
      return { remotes: output.trim() || 'No remotes configured' };
    }
    if (action === 'add') {
      if (!name || !url) return { error: 'Name and URL are required' };
      const output = git(`remote add ${name} ${url}`);
      return { added: name, url, output: output.trim() };
    }
    if (action === 'remove') {
      if (!name) return { error: 'Remote name is required' };
      const output = git(`remote remove ${name}`);
      return { removed: name, output: output.trim() };
    }
    return { error: 'Invalid action' };
  },
});

export const gitShowTool = tool({
  description: 'Show details of a specific commit',
  parameters: z.object({
    commit: z.string().optional().describe('Commit hash (default: HEAD)'),
  }),
  execute: async ({ commit }) => {
    const c = commit || 'HEAD';
    const output = git(`show ${c} --stat`);
    const diff = git(`show ${c}`);
    return { commit: c, summary: output.trim(), diff: diff.slice(0, 20000) };
  },
});
