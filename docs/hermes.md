# Hermes Agent — Architecture & Configuration

## Architecture

```
Browser (React)
  ↓ HTTP + SSE
nginx (frontend:80)
  ↓ /api/ai/*
Express Backend (label-studio:3001)
  ↓ HTTP + SSE
Hermes Agent (hermes:3002)
  ↓ filesystem access
/workspace (project directory)
```

### Containers

| Container | Image | Port | Network |
|---|---|---|---|
| `frontend` | nginx:alpine | 80 → 3000 | default |
| `label-studio` | node:20-alpine | 3001 | default |
| `hermes` | node:20-alpine | 3002 (internal only) | default |

Hermes is **not** exposed publicly. Only the backend communicates with it via Docker internal networking.

## Startup

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f hermes
docker compose logs -f label-studio
```

### Manual Development

```bash
# Start Hermes locally
cd hermes
npm install
cp .env.example .env
npm run dev

# Start backend
cd server
npm start
```

## Configuration

### Provider Settings (Web UI)

Navigate to `/assistant` in the web application. Click the settings icon to configure:

- **API Endpoint**: Any OpenAI-compatible API URL
  - OpenAI: `https://api.openai.com/v1/chat/completions`
  - OpenRouter: `https://openrouter.ai/api/v1/chat/completions`
  - Ollama: `http://localhost:11434/v1/chat/completions`
  - Custom: Any OpenAI-compatible endpoint

- **API Key**: Your provider's API key (optional for local providers)

- **Model**: The model to use (e.g., `gpt-4o`, `claude-3.5-sonnet`, `deepseek-chat`)

- **Provider Name**: Optional display name

Configuration is stored in `localStorage` and persists across sessions.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `HERMES_PORT` | `3002` | Hermes server port |
| `WORKSPACE_PATH` | `/workspace` | Project workspace path |
| `HERMES_URL` | `http://hermes:3002` | Backend → Hermes URL |
| `LOG_LEVEL` | `info` | Logging level |
| `JWT_SECRET` | (required) | JWT signing secret |

## Tools

Hermes has access to these tools:

### File Operations
- `read_file` — Read file contents with optional line range
- `write_file` — Write/overwrite file content
- `edit_file` — Targeted search-and-replace edits
- `create_file` — Create new file (fails if exists)
- `delete_file` — Delete a file
- `rename_file` — Rename or move a file
- `list_directory` — List directory contents

### Shell Commands
- `run_command` — Execute shell commands (npm, git, etc.)

### Git Operations
- `git_status` — Show working tree status
- `git_diff` — Show file changes
- `git_add` — Stage files
- `git_commit` — Create commits
- `git_log` — Show commit history

### Search
- `search_files` — Glob pattern file search
- `search_code` — Content search (ripgrep/grep)
- `project_info` — Project overview (package.json, tsconfig, etc.)

## Safety

### Blocked Commands
These shell commands are blocked:
- `rm -rf /`, `rm -rf /*`
- `mkfs`, `dd if=`
- Fork bombs
- `shutdown`, `reboot`, `halt`
- `chmod -R 777 /`
- `> /dev/sda`

### File Operations
- All paths are resolved within `/workspace`
- Path traversal (`../`) is blocked
- File operations are logged

## Troubleshooting

### Hermes won't start
```bash
docker compose logs hermes
```

Common issues:
- Port 3002 already in use
- Missing workspace mount

### Chat not streaming
1. Check nginx config has SSE support for `/api/ai/`
2. Verify provider settings in the web UI
3. Check backend logs for proxy errors

### "Hermes unreachable" error
```bash
# Verify Hermes is running
docker compose ps hermes

# Test health endpoint
curl http://localhost:3002/health

# Check backend can reach hermes
docker compose exec label-studio wget -qO- http://hermes:3002/health
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ai/chat` | JWT | Stream chat response (SSE) |
| `POST` | `/api/ai/models` | JWT | Fetch available models |
| `GET` | `/api/ai/health` | JWT | Check Hermes health |

### Chat Request

```json
POST /api/ai/chat
Authorization: Bearer <token>

{
  "messages": [
    { "role": "user", "content": "Explain the project structure" }
  ],
  "config": {
    "apiEndpoint": "https://api.openai.com/v1/chat/completions",
    "apiKey": "sk-...",
    "model": "gpt-4o"
  }
}
```

Response: SSE stream with events:
- `text-delta` — Incremental text
- `tool-call` — Tool invocation
- `tool-result` — Tool output
- `done` — Stream complete
- `error` — Error occurred
