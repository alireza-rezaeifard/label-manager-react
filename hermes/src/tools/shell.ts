import { tool } from 'ai';
import { z } from 'zod';
import { execSync, spawn } from 'child_process';

const WORKSPACE = process.env.WORKSPACE_PATH || '/workspace';

const BLOCKED_COMMANDS = [
  'rm -rf /', 'rm -rf /*', 'mkfs', 'dd if=', ':(){', 'fork',
  ':|:&', 'shutdown', 'reboot', 'halt', 'init 0', 'init 6',
  'chmod -R 777 /', 'chown -R', '> /dev/sda',
];

function isBlocked(command: string): boolean {
  const normalized = command.toLowerCase().trim();
  return BLOCKED_COMMANDS.some(blocked => normalized.includes(blocked));
}

export const runCommandTool = tool({
  description: 'Execute a shell command in the workspace directory. Use for npm, git, node, ls, cat, grep, find, etc. Dangerous commands are blocked.',
  parameters: z.object({
    command: z.string().describe('The shell command to execute'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
  }),
  execute: async ({ command, timeout }) => {
    if (isBlocked(command)) {
      return { error: `Command blocked for safety: ${command}` };
    }
    try {
      const output = execSync(command, {
        cwd: WORKSPACE,
        encoding: 'utf-8',
        timeout: timeout || 30000,
        maxBuffer: 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { command, output: output.slice(0, 10000), exitCode: 0 };
    } catch (err: any) {
      return {
        command,
        output: (err.stdout || '').slice(0, 5000),
        error: (err.stderr || err.message || '').slice(0, 5000),
        exitCode: err.status || 1,
      };
    }
  },
});

export const runCommandStreamTool = tool({
  description: 'Execute a long-running shell command with streaming output. Use for npm run dev, npm run build, or commands that produce ongoing output.',
  parameters: z.object({
    command: z.string().describe('The shell command to execute'),
    args: z.array(z.string()).optional().describe('Command arguments as separate array items'),
    timeout: z.number().optional().describe('Timeout in ms (default: 60000)'),
  }),
  execute: async ({ command, args, timeout }) => {
    if (isBlocked(command)) {
      return { error: `Command blocked for safety: ${command}` };
    }
    return new Promise((resolve) => {
      const child = spawn(command, args || [], {
        cwd: WORKSPACE,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          command,
          output: stdout.slice(0, 10000),
          error: stderr.slice(0, 5000) || 'Timed out',
          exitCode: -1,
          timedOut: true,
        });
      }, timeout || 60000);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          command,
          output: stdout.slice(0, 10000),
          error: stderr.slice(0, 5000),
          exitCode: code,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({ command, error: err.message, exitCode: 1 });
      });
    });
  },
});
