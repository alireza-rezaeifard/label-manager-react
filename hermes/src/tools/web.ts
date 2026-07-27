import { tool } from 'ai';
import { z } from 'zod';

export const fetchWebPageTool = tool({
  description: 'Fetch content from a URL. Returns the text content of the page.',
  parameters: z.object({
    url: z.string().url().describe('The URL to fetch'),
    maxChars: z.number().optional().describe('Max characters to return (default: 10000)'),
  }),
  execute: async ({ url, maxChars }) => {
    const max = maxChars || 10000;
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Hermes/1.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        return { error: `HTTP ${response.status}: ${response.statusText}`, url };
      }
      const text = await response.text();
      return { url, content: text.slice(0, max), truncated: text.length > max, totalLength: text.length };
    } catch (err: any) {
      return { error: err.message, url };
    }
  },
});
