import type { Env } from './auth';
import { json, error, authenticateRequest, signJWT } from './auth';
import { handleAuth } from './routes/auth';
import { handleRecords } from './routes/records';
import { handleWorkspaces } from './routes/workspaces';
import { handleCustomFields } from './routes/custom-fields';
import { handleApiKeys } from './routes/api-keys';
import { handleWebhooks } from './routes/webhooks';
import { handleNotifications } from './routes/notifications';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS headers
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Serve API routes
    if (pathname.startsWith('/api/')) {
      try {
        const apiPath = pathname.replace(/^\/api\/v1\//, '/api/').replace(/^\/api\//, '');
        const response = await routeAPI(request, env, ctx, apiPath);
        // Add CORS headers to API responses
        for (const [key, value] of Object.entries(corsHeaders)) {
          response.headers.set(key, value);
        }
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message === 'Unauthorized' || message === 'Invalid token' || message === 'Token expired') {
          return json({ error: message === 'Unauthorized' ? 'Unauthorized' : 'Invalid or expired token', code: 'UNAUTHORIZED' }, 401, corsHeaders);
        }
        console.error('[Worker Error]', err);
        return json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500, corsHeaders);
      }
    }

    // Serve static assets (SPA)
    return env.ASSETS.fetch(request);
  },
};

async function routeAPI(request: Request, env: Env, ctx: ExecutionContext, path: string): Promise<Response> {
  // Health check
  if (path === 'health') {
    return json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '3.0.0-workers',
      runtime: 'cloudflare-workers',
    });
  }

  // Version
  if (path === 'version') {
    return json({ version: '3.0.0', apiVersions: ['v1'], runtime: 'cloudflare-workers' });
  }

  // Auth routes
  if (path === 'auth' || path.startsWith('auth/')) {
    return handleAuth(request, env, path === 'auth' ? '' : path.replace('auth/', ''));
  }

  // Records routes
  if (path === 'records' || path.startsWith('records/')) {
    return handleRecords(request, env, path === 'records' ? '' : path.replace('records/', ''));
  }

  // Workspace routes
  if (path === 'workspaces' || path.startsWith('workspaces/')) {
    return handleWorkspaces(request, env, path === 'workspaces' ? '' : path.replace('workspaces/', ''));
  }

  // Custom fields routes
  if (path === 'custom-fields' || path.startsWith('custom-fields/')) {
    return handleCustomFields(request, env, path === 'custom-fields' ? '' : path.replace('custom-fields/', ''));
  }

  // API keys routes
  if (path === 'api-keys' || path.startsWith('api-keys/')) {
    return handleApiKeys(request, env, path === 'api-keys' ? '' : path.replace('api-keys/', ''));
  }

  // Webhooks routes
  if (path === 'webhooks' || path.startsWith('webhooks/')) {
    return handleWebhooks(request, env, path === 'webhooks' ? '' : path.replace('webhooks/', ''));
  }

  // Notifications routes
  if (path === 'notifications' || path.startsWith('notifications/')) {
    return handleNotifications(request, env, path === 'notifications' ? '' : path.replace('notifications/', ''));
  }

  // Upload routes (file/image)
  if ((path === 'upload-file' || path === 'upload-image') && request.method === 'POST') {
    return handleUpload(request, env);
  }

  // Setup endpoint - creates admin user and default workspace
  if (path === 'setup' && request.method === 'POST') {
    return handleSetup(env);
  }

  return error(`Route ${request.method} /api/${path} not found`, 404, 'NOT_FOUND');
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env.JWT_SECRET);
  const body = await request.json() as { file?: string; image?: string };
  const data = body.file || body.image;
  if (!data) return error('No file data', 400, 'MISSING_FILE');

  const maxSize = 5 * 1024 * 1024;
  if (data.length > maxSize) return error('File too large (max 5MB)', 400, 'FILE_TOO_LARGE');

  const dataUriMatch = data.match(/^data:([^;]+);base64,(.+)$/);
  if (!dataUriMatch) return error('Invalid file data URI format', 400, 'INVALID_FILE');

  const mime = dataUriMatch[1];
  const allowed: Record<string, string> = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
    'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
  };
  const ext = allowed[mime];
  if (!ext) return error(`Unsupported file type: ${mime}`, 400, 'UNSUPPORTED_TYPE');

  // In Workers, we return the data URI directly as the URL
  // For production, use R2 storage: store the file and return the public URL
  return json({ url: data });
}

async function handleSetup(env: Env): Promise<Response> {
  try {
    // Check if admin user exists
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind('admin').first();
    if (existing) {
      return json({ ok: true, message: 'Setup already completed', alreadySetup: true });
    }

    // Create admin user with a default password
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt, b => b.toString(16).padStart(2, '0')).join('');
    const defaultPassword = 'admin123';
    const key = await crypto.subtle.importKey('raw', encoder.encode(defaultPassword), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, salt);
    const hash = `$sha256$${saltHex}$${Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('')}`;

    await env.DB.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').bind('admin', hash, 'admin').run();

    // Create default workspace
    await env.DB.prepare('INSERT INTO workspaces (id, name, description, created_by) VALUES (1, ?, ?, NULL)').bind(
      'Personal Workspace', 'Default personal workspace'
    ).run();

    const adminUser = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind('admin').first<{ id: number }>();
    if (adminUser) {
      await env.DB.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (1, ?, ?)').bind(adminUser.id, 'owner').run();
    }

    return json({
      ok: true,
      message: 'Setup completed. Default admin user created.',
      credentials: { username: 'admin', password: 'admin123' },
      warning: 'Change the password immediately after first login!',
    });
  } catch (err) {
    return json({ error: 'Setup failed: ' + (err instanceof Error ? err.message : String(err)) }, 500);
  }
}
