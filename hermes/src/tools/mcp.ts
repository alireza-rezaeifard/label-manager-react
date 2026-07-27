import { tool } from 'ai';
import { z } from 'zod';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';

const WORKSPACE = process.env.WORKSPACE_PATH || '/workspace';
const MCP_CONFIG_PATH = path.join(WORKSPACE, '.hermes-mcp.json');

interface McpServer {
  name: string;
  process: ChildProcess;
  tools: Array<{ name: string; description: string; inputSchema: any }>;
  ready: boolean;
}

const servers: Map<string, McpServer> = new Map();

async function sendRequest(server: McpServer, method: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = Date.now().toString();
    const request = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    const timeout = setTimeout(() => reject(new Error('MCP request timeout')), 30000);

    const onData = (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === id) {
            clearTimeout(timeout);
            server.process.stdout?.off('data', onData);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
            return;
          }
        } catch { /* skip non-JSON */ }
      }
    };

    server.process.stdout?.on('data', onData);
    server.process.stdin?.write(request);
  });
}

async function connectServer(name: string, command: string, args: string[] = [], env?: Record<string, string>): Promise<McpServer> {
  if (servers.has(name)) {
    const existing = servers.get(name)!;
    if (existing.ready) return existing;
  }

  const proc = spawn(command, args, {
    cwd: WORKSPACE,
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const server: McpServer = { name, process: proc, tools: [], ready: false };
  servers.set(name, server);

  try {
    // Initialize
    await sendRequest(server, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'hermes', version: '1.0.0' },
    });

    // Notify initialized
    server.process.stdin?.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

    // List tools
    const result = await sendRequest(server, 'tools/list');
    server.tools = (result?.tools || []).map((t: any) => ({
      name: t.name,
      description: t.description || '',
      inputSchema: t.inputSchema || { type: 'object', properties: {} },
    }));
    server.ready = true;

    return server;
  } catch (err: any) {
    servers.delete(name);
    throw new Error(`Failed to connect to MCP server "${name}": ${err.message}`);
  }
}

async function callTool(serverName: string, toolName: string, args: Record<string, any>): Promise<any> {
  const server = servers.get(serverName);
  if (!server || !server.ready) {
    throw new Error(`MCP server "${serverName}" is not connected`);
  }
  const result = await sendRequest(server, 'tools/call', { name: toolName, arguments: args });
  return result;
}

function disconnectServer(name: string) {
  const server = servers.get(name);
  if (server) {
    server.process.kill();
    servers.delete(name);
  }
}

// ---- Exported Tools ----

export const mcpConnectTool = tool({
  description: 'Connect to an MCP (Model Context Protocol) server. After connecting, you can list and call its tools.',
  parameters: z.object({
    name: z.string().describe('A friendly name for this server connection'),
    command: z.string().describe('The command to start the MCP server (e.g., "npx", "node")'),
    args: z.array(z.string()).optional().describe('Command arguments'),
    env: z.record(z.string()).optional().describe('Environment variables'),
  }),
  execute: async ({ name, command, args, env }) => {
    try {
      const server = await connectServer(name, command, args || [], env);
      return {
        connected: true,
        name,
        tools: server.tools.map(t => ({ name: t.name, description: t.description })),
        toolCount: server.tools.length,
      };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  },
});

export const mcpListServersTool = tool({
  description: 'List all connected MCP servers and their available tools',
  parameters: z.object({}),
  execute: async () => {
    const result: Array<{ name: string; tools: Array<{ name: string; description: string }> }> = [];
    for (const [name, server] of servers) {
      result.push({
        name,
        tools: server.tools.map(t => ({ name: t.name, description: t.description })),
      });
    }
    return { servers: result, total: result.length };
  },
});

export const mcpCallTool = tool({
  description: 'Call a tool on a connected MCP server',
  parameters: z.object({
    server: z.string().describe('The MCP server name'),
    tool: z.string().describe('The tool name to call'),
    args: z.record(z.any()).optional().describe('Tool arguments as a JSON object'),
  }),
  execute: async ({ server, tool: toolName, args }) => {
    try {
      const result = await callTool(server, toolName, args || {});
      return result;
    } catch (err: any) {
      return { error: err.message };
    }
  },
});

export const mcpDisconnectTool = tool({
  description: 'Disconnect from an MCP server',
  parameters: z.object({
    name: z.string().describe('The MCP server name to disconnect'),
  }),
  execute: async ({ name }) => {
    disconnectServer(name);
    return { disconnected: true, name };
  },
});
