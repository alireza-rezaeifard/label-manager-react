import { tool } from 'ai';
import { z } from 'zod';
import crypto from 'crypto';

export const getCurrentTimeTool = tool({
  description: 'Get the current date and time, optionally in a specific timezone',
  parameters: z.object({
    timezone: z.string().optional().describe('IANA timezone (e.g., "Asia/Tehran", "UTC", "America/New_York")'),
  }),
  execute: async ({ timezone }) => {
    const now = new Date();
    const tz = timezone || 'UTC';
    return {
      iso: now.toISOString(),
      local: now.toLocaleString('en-US', { timeZone: tz }),
      timestamp: now.getTime(),
      timezone: tz,
    };
  },
});

export const jsonTool = tool({
  description: 'Parse, format, or validate JSON. Converts between string and object, or pretty-prints JSON.',
  parameters: z.object({
    action: z.enum(['parse', 'stringify', 'validate', 'getKeys', 'getValue']).describe('Action to perform'),
    input: z.string().describe('JSON string input'),
    path: z.string().optional().describe('Dot-notation path to get a value (e.g., "data.records.0.name")'),
  }),
  execute: async ({ action, input, path: jsonPath }) => {
    try {
      if (action === 'validate') {
        JSON.parse(input);
        return { valid: true };
      }
      if (action === 'parse') {
        const parsed = JSON.parse(input);
        return { result: parsed };
      }
      if (action === 'stringify') {
        try {
          const obj = typeof input === 'string' ? JSON.parse(input) : input;
          return { result: JSON.stringify(obj, null, 2) };
        } catch {
          return { result: input };
        }
      }
      if (action === 'getKeys') {
        const obj = JSON.parse(input);
        const keys = Array.isArray(obj) ? obj.map((_, i) => String(i)) : Object.keys(obj);
        return { keys };
      }
      if (action === 'getValue') {
        if (!jsonPath) return { error: 'path is required for getValue' };
        const obj = JSON.parse(input);
        const parts = jsonPath.split('.');
        let current: any = obj;
        for (const part of parts) {
          if (current == null) return { error: `Cannot access property '${part}' of ${typeof current}` };
          current = current[part];
        }
        return { value: current };
      }
      return { error: 'Invalid action' };
    } catch (err: any) {
      return { error: err.message };
    }
  },
});

export const hashTool = tool({
  description: 'Compute a hash of the input string (MD5, SHA256, SHA512)',
  parameters: z.object({
    input: z.string().describe('String to hash'),
    algorithm: z.enum(['md5', 'sha256', 'sha512']).optional().describe('Hash algorithm (default: sha256)'),
  }),
  execute: async ({ input, algorithm }) => {
    const algo = algorithm || 'sha256';
    const hash = crypto.createHash(algo).update(input).digest('hex');
    return { input, algorithm: algo, hash };
  },
});

export const generateIdTool = tool({
  description: 'Generate a unique ID (UUID v4 or random string)',
  parameters: z.object({
    type: z.enum(['uuid', 'nanoid', 'hex']).describe('Type of ID to generate'),
    length: z.number().optional().describe('Length for hex/nanoid (default: 21)'),
  }),
  execute: async ({ type, length }) => {
    if (type === 'uuid') {
      return { id: crypto.randomUUID() };
    }
    if (type === 'hex') {
      const len = length || 21;
      return { id: crypto.randomBytes(len).toString('hex').slice(0, len) };
    }
    if (type === 'nanoid') {
      const len = length || 21;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
      let id = '';
      for (let i = 0; i < len; i++) {
        id += chars[crypto.randomInt(chars.length)];
      }
      return { id };
    }
    return { error: 'Invalid type' };
  },
});

export const textTransformTool = tool({
  description: 'Transform text: uppercase, lowercase, camelCase, snake_case, kebab-case, reverse, truncate, etc.',
  parameters: z.object({
    text: z.string().describe('Input text'),
    transform: z.enum([
      'uppercase', 'lowercase', 'capitalize', 'titleCase',
      'camelCase', 'snake_case', 'kebab-case', 'PascalCase',
      'reverse', 'trim', 'slugify',
    ]).describe('Transformation to apply'),
    maxLen: z.number().optional().describe('Max length for truncation'),
  }),
  execute: async ({ text, transform, maxLen }) => {
    let result = text;
    switch (transform) {
      case 'uppercase': result = text.toUpperCase(); break;
      case 'lowercase': result = text.toLowerCase(); break;
      case 'capitalize': result = text.charAt(0).toUpperCase() + text.slice(1); break;
      case 'titleCase': result = text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()); break;
      case 'camelCase': result = text.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^[A-Z]/, c => c.toLowerCase()); break;
      case 'snake_case': result = text.replace(/([A-Z])/g, '_$1').replace(/[-\s]+/g, '_').toLowerCase().replace(/^_/, ''); break;
      case 'kebab-case': result = text.replace(/([A-Z])/g, '-$1').replace(/[_\s]+/g, '-').toLowerCase().replace(/^-/, ''); break;
      case 'PascalCase': result = text.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^[a-z]/, c => c.toUpperCase()); break;
      case 'reverse': result = text.split('').reverse().join(''); break;
      case 'trim': result = text.trim(); break;
      case 'slugify': result = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); break;
    }
    if (maxLen && result.length > maxLen) result = result.slice(0, maxLen) + '...';
    return { original: text, transformed: result, transform };
  },
});
