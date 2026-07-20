const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

const ENTITY_RE = /[&<>"']/g;

export function sanitize(str: unknown): unknown {
  if (typeof str !== 'string') return str;
  return str.replace(ENTITY_RE, (ch) => ENTITY_MAP[ch] || ch);
}

export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      clean[key] = sanitize(val);
    } else if (Array.isArray(val)) {
      clean[key] = val.map(v => typeof v === 'string' ? sanitize(v) : v);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}
