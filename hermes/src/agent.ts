import { streamText, tool, type CoreMessage } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
import {
  readFileTool, writeFileTool, editFileTool, createFileTool,
  deleteFileTool, renameFileTool, listDirectoryTool,
  copyFileTool, appendFileTool, getFileInfoTool, searchInFileTool,
} from './tools/files.js';
import { runCommandTool, runCommandStreamTool } from './tools/shell.js';
import {
  gitStatusTool, gitDiffTool, gitAddTool, gitCommitTool, gitLogTool,
  gitBranchTool, gitCheckoutTool, gitStashTool, gitPushTool, gitPullTool,
  gitRemoteTool, gitShowTool,
} from './tools/git.js';
import { searchFilesTool, searchCodeTool, getProjectInfoTool } from './tools/search.js';
import {
  searchRecordsTool, getRecordByCodeTool, getRecordByIdTool,
  listRecordsTool, getRecordStatsTool,
  executeQueryTool, getTableSchemaTool, executeWriteTool,
} from './tools/database.js';
import {
  createGenerateMonthlyReportTool, createCreateArtifactTool, type EmitArtifact,
} from './tools/report.js';
import { fetchWebPageTool } from './tools/web.js';
import {
  getCurrentTimeTool, jsonTool, hashTool, generateIdTool, textTransformTool,
} from './tools/utility.js';
import {
  mcpConnectTool, mcpListServersTool, mcpCallTool, mcpDisconnectTool,
} from './tools/mcp.js';
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
  /** TaxBook workspace scope for data tools + artifacts (validated upstream) */
  workspaceId?: number | null;
}

const SYSTEM_PROMPT = `You are Hermes, the AI agent operating inside TaxBook — a Persian RTL financial record/label manager. You have full access to the project workspace and its database.

IMPORTANT: You MUST use the provided tools to accomplish tasks. Do NOT describe what you would do — actually do it by calling the appropriate tools. When a user asks you to read a file, call read_file. When they ask to run a command, call run_command. Always use tools rather than explaining what the tools do.

CAPABILITIES (use these tools):
- Read, create, edit, copy, rename, delete files
- Search files by name (glob) and content (regex or text)
- Get file metadata (size, dates, permissions)
- Run shell commands (npm, git, node, python, etc.)
- Git operations (status, diff, add, commit, branch, checkout, stash, push, pull, remote, log, show)
- Query the project's SQLite database (records by code/id, search, list, stats, raw SQL)
- Execute read-only SQL queries for custom analysis
- Get database schema information
- Fetch web pages and content
- MCP server integration (connect to external tool servers)
- Text transformations (case changes, slugify, etc.)
- JSON parsing and manipulation
- Hash computation (MD5, SHA256, SHA512)
- Generate unique IDs (UUID, nanoid, hex)
- Get current time in any timezone

DATABASE:
The project has a SQLite database (records table) with fields: id, workspace_id, code, project, type, date, party, amount, related, tags, image, color, notes, is_favorite, created_at, updated_at, deleted_at.
- ALWAYS filter by the current workspace_id given in the conversation context.
- Use get_record_by_code for exact code lookups (e.g., "HR-1404-012")
- Use search_records for text search across fields
- Use list_records for filtered/paginated listing
- Use get_record_stats for aggregate statistics
- Use execute_query for custom SQL (SELECT only)
- Use get_table_schema to explore database structure

REPORTS & ARTIFACTS:
- For "monthly report" / "گزارش ماهانه" requests use generate_monthly_report — it queries real activity data and produces a Persian PDF file automatically. Do NOT build reports from git_log: git history is source-code history, NOT user data changes.
- Dates in TaxBook records are Jalali (Solar Hijri). The activity_log.created_at is Gregorian UTC. Use generate_monthly_report instead of hand-writing date math whenever possible.
- Use create_artifact to deliver any text content (csv/json/txt/md) as a real downloadable file.
- Never invent report numbers — every number must come from a tool result.

FILE OPERATIONS:
- Prefer editFile for targeted changes (search-and-replace)
- Use writeFile for new files or complete rewrites
- Use createFile when you want to fail if file exists
- Use copyFile to duplicate files
- Use appendFile to add to end of file
- Use getFileInfo for metadata
- Use searchInFile to find patterns in a specific file

GIT:
- Use git_status to see current state
- Use git_diff to see changes
- Use git_add + git_commit to save changes
- Use git_branch to manage branches
- Use git_checkout to switch branches
- Use git_stash for temporary storage
- Use git_push/git_pull for remote sync
- Use git_show to inspect specific commits

MCP SERVERS:
- Use mcp_connect to connect to an MCP server (e.g., "npx @modelcontextprotocol/server-xxx")
- Use mcp_list to see connected servers and their tools
- Use mcp_call to invoke a tool on a connected server
- Use mcp_disconnect to close a connection

Be concise, accurate, and helpful. Always explain what you're doing. Respond in the same language as the user's prompt.`;

function createProvider(config: ProviderConfig) {
  const baseURL = config.apiEndpoint.replace(/\/chat\/completions\/?$/, '');
  log.info({ originalEndpoint: config.apiEndpoint, computedBaseURL: baseURL }, 'Provider baseURL computed');
  return createOpenAICompatible({
    name: config.providerName || 'custom',
    baseURL,
    apiKey: config.apiKey,
  });
}

function buildTools(callbacks?: StreamCallbacks) {
  const emitArtifact: EmitArtifact = (artifact) => {
    callbacks?.onArtifact?.(artifact);
  };

  return {
    // Files
    read_file: readFileTool,
    write_file: writeFileTool,
    edit_file: editFileTool,
    create_file: createFileTool,
    delete_file: deleteFileTool,
    rename_file: renameFileTool,
    copy_file: copyFileTool,
    append_file: appendFileTool,
    get_file_info: getFileInfoTool,
    search_in_file: searchInFileTool,
    list_directory: listDirectoryTool,
    // Shell
    run_command: runCommandTool,
    // Git
    git_status: gitStatusTool,
    git_diff: gitDiffTool,
    git_add: gitAddTool,
    git_commit: gitCommitTool,
    git_log: gitLogTool,
    git_branch: gitBranchTool,
    git_checkout: gitCheckoutTool,
    git_stash: gitStashTool,
    git_push: gitPushTool,
    git_pull: gitPullTool,
    git_remote: gitRemoteTool,
    git_show: gitShowTool,
    // Search
    search_files: searchFilesTool,
    search_code: searchCodeTool,
    project_info: getProjectInfoTool,
    // Database
    search_records: searchRecordsTool,
    get_record_by_code: getRecordByCodeTool,
    get_record_by_id: getRecordByIdTool,
    list_records: listRecordsTool,
    get_record_stats: getRecordStatsTool,
    execute_query: executeQueryTool,
    get_table_schema: getTableSchemaTool,
    execute_write: executeWriteTool,
    // Web
    fetch_web_page: fetchWebPageTool,
    // Utility
    get_current_time: getCurrentTimeTool,
    json: jsonTool,
    hash: hashTool,
    generate_id: generateIdTool,
    text_transform: textTransformTool,
    // Reports & artifacts
    generate_monthly_report: createGenerateMonthlyReportTool(emitArtifact),
    create_artifact: createCreateArtifactTool(emitArtifact),
    // MCP
    mcp_connect: mcpConnectTool,
    mcp_list: mcpListServersTool,
    mcp_call: mcpCallTool,
    mcp_disconnect: mcpDisconnectTool,
  };
}

export interface StreamCallbacks {
  onTextDelta?: (delta: string) => void;
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
  onToolResult?: (toolCallId: string, result: unknown) => void;
  /** binary artifact produced by a report/export tool (base64, server-to-server) */
  onArtifact?: (artifact: { filename: string; mime_type: string; size: number; data_base64: string }) => void;
  onFinish?: (steps: any[]) => void;
}

export function streamChatResponse(request: ChatRequest, callbacks?: StreamCallbacks) {
  const { messages, config, workspaceId } = request;
  const provider = createProvider(config);
  const tools = buildTools(callbacks);

  // Scope data tools to the requesting workspace via the system prompt.
  const system = workspaceId
    ? `${SYSTEM_PROMPT}\n\nCONVERSATION CONTEXT: The user is working in TaxBook workspace_id = ${workspaceId}. Pass this exact id to generate_monthly_report and create_artifact, and use it in every SQL query against workspace-scoped tables.`
    : SYSTEM_PROMPT;

  log.info({
    model: config.model,
    endpoint: config.apiEndpoint,
    messageCount: messages.length,
    workspaceId,
  }, 'Starting chat stream');

  const result = streamText({
    model: provider(config.model),
    system,
    messages,
    tools,
    toolChoice: 'auto',
    maxSteps: 15,
    onStepFinish: ({ toolCalls, toolResults, text, finishReason }) => {
      log.info({
        toolCallCount: toolCalls.length,
        toolResultCount: toolResults?.length || 0,
        textLength: text?.length || 0,
        stepFinish: finishReason,
      }, 'Step finished');
      if (toolCalls.length > 0) {
        for (const tc of toolCalls) {
          callbacks?.onToolCall?.(tc.toolName, tc.args as Record<string, unknown>);
        }
      }
      if (toolResults && toolResults.length > 0) {
        for (const tr of toolResults) {
          callbacks?.onToolResult?.(tr.toolCallId, tr.result);
        }
      }
    },
    onFinish: (event: any) => {
      const steps = event.steps || [];
      log.info({ stepCount: steps.length, text: event.text?.substring(0, 200) }, 'Stream finished');
      callbacks?.onFinish?.(steps);
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
