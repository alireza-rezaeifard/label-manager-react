import { streamText, tool, type CoreMessage } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
import {
  readFileTool, writeFileTool, editFileTool, createFileTool,
  deleteFileTool, renameFileTool, listDirectoryTool,
} from './tools/files.js';
import { runCommandTool, runCommandStreamTool } from './tools/shell.js';
import {
  gitStatusTool, gitDiffTool, gitAddTool, gitCommitTool, gitLogTool,
} from './tools/git.js';
import { searchFilesTool, searchCodeTool, getProjectInfoTool } from './tools/search.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('agent');

export interface ProviderConfig {
  apiEndpoint: string;
  apiKey: string;
  model: string;
  providerName?: string;
}

export interface ChatRequest {
  messages: CoreMessage[];
  config: ProviderConfig;
  conversationId?: string;
}

const SYSTEM_PROMPT = `You are Hermes, an expert AI coding assistant embedded in a React + TypeScript project.
You have full access to the project workspace at /workspace.

You can:
- Read, create, edit, rename, and delete files
- Search files by name (glob) and content (regex)
- Run shell commands (npm, git, node, etc.)
- Inspect project structure, dependencies, configs
- Generate React components, TypeScript code, tests
- Refactor code, update routes, install packages
- Execute builds and run tests
- Perform git operations (status, diff, add, commit)

When modifying files:
- Prefer editFile for targeted changes (search-and-replace)
- Only use writeFile for new files or complete rewrites
- Always explain what you changed and why

When running commands:
- Use appropriate timeouts
- Explain command output to the user

Be concise, accurate, and helpful. Respond in the same language as the user's prompt.`;

function createProvider(config: ProviderConfig) {
  return createOpenAICompatible({
    name: config.providerName || 'custom',
    baseURL: config.apiEndpoint.replace(/\/chat\/completions\/?$/, '').replace(/\/v1\/?$/, ''),
    apiKey: config.apiKey,
  });
}

function buildTools() {
  return {
    read_file: readFileTool,
    write_file: writeFileTool,
    edit_file: editFileTool,
    create_file: createFileTool,
    delete_file: deleteFileTool,
    rename_file: renameFileTool,
    list_directory: listDirectoryTool,
    run_command: runCommandTool,
    git_status: gitStatusTool,
    git_diff: gitDiffTool,
    git_add: gitAddTool,
    git_commit: gitCommitTool,
    git_log: gitLogTool,
    search_files: searchFilesTool,
    search_code: searchCodeTool,
    project_info: getProjectInfoTool,
  };
}

export function streamChatResponse(request: ChatRequest) {
  const { messages, config } = request;
  const provider = createProvider(config);
  const tools = buildTools();

  log.info({
    model: config.model,
    endpoint: config.apiEndpoint,
    messageCount: messages.length,
  }, 'Starting chat stream');

  const result = streamText({
    model: provider(config.model),
    system: SYSTEM_PROMPT,
    messages,
    tools,
    maxSteps: 15,
    onStepFinish: ({ toolCalls, toolResults, text, finishReason }) => {
      if (toolCalls.length > 0) {
        log.info({
          toolCalls: toolCalls.map(tc => tc.toolName),
          stepFinish: finishReason,
        }, 'Tool calls executed');
      }
      if (text) {
        log.debug({ textLength: text.length }, 'Text generated');
      }
    },
  });

  return result;
}

export async function fetchAvailableModels(apiEndpoint: string, apiKey: string): Promise<string[]> {
  try {
    const baseUrl = apiEndpoint.replace(/\/chat\/completions\/?$/, '').replace(/\/v1\/?$/, '');
    const modelsUrl = `${baseUrl}/v1/models`;

    log.info({ url: modelsUrl }, 'Fetching available models');

    const response = await fetch(modelsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      log.warn({ status: response.status }, 'Failed to fetch models');
      return [];
    }

    const data = await response.json() as any;
    const models = data.data?.map((m: any) => m.id) || [];
    log.info({ count: models.length }, 'Models fetched');
    return models.sort();
  } catch (err: any) {
    log.error({ error: err.message }, 'Error fetching models');
    return [];
  }
}
