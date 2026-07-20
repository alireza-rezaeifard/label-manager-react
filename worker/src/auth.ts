export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET: string;
  ASSETS: Fetcher;
}

export interface JWTPayload {
  id: number;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

const ROLE_HIERARCHY: Record<string, number> = { owner: 10, admin: 8, editor: 5, viewer: 1 };

function base64UrlEncode(data: string | Uint8Array): string {
  let str: string;
  if (typeof data === 'string') {
    str = btoa(data);
  } else {
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    str = btoa(binary);
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecodeString(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string, expiresInDays = 7): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInDays * 86400;

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify({ ...payload, iat: now, exp }));

  const data = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigB64 = base64UrlEncode(new Uint8Array(signature));

  return `${data}.${sigB64}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');

  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );

  const signature = base64UrlDecode(sigB64);
  const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));

  if (!valid) throw new Error('Invalid signature');

  const payload: JWTPayload = JSON.parse(base64UrlDecodeString(payloadB64));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}

export function extractUser(request: Request): JWTPayload | null {
  const header = request.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  return null; // actual verification happens async
}

export async function authenticateRequest(request: Request, secret: string): Promise<JWTPayload> {
  const header = request.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = header.split(' ')[1];
  return verifyJWT(token, secret);
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function error(message: string, status = 400, code = 'BAD_REQUEST'): Response {
  return json({ error: message, code }, status);
}

export function roleLevel(role: string): number {
  return ROLE_HIERARCHY[role] || 0;
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
