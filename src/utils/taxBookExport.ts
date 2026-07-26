import * as XLSX from 'xlsx';
import type { RecordItem, FieldDef, CustomField, TaxBookEntry } from '../types';

// Standard 9-column format for Iranian electronic legal books
// Reference: Electronics_books_template.xlsx
export const TAX_BOOK_HEADERS = [
  'ردیف',
  'تاریخ',
  'کد حساب کل',
  'عنوان حساب کل',
  'کد حساب معین',
  'عنوان حساب معین',
  'شرح',
  'مبلغ بدهکار (ریال)',
  'مبلغ بستانکار (ریال)',
];

function getFieldValue(record: RecordItem, fieldKey: string): string {
  if (fieldKey === 'related') {
    return Array.isArray(record.related) ? record.related.join(', ') : '';
  }
  const val = (record as Record<string, unknown>)[fieldKey];
  return val != null ? String(val) : '';
}

function toRials(amount: string): number {
  const num = Number(String(amount).replace(/[,\s]/g, ''));
  if (isNaN(num)) return 0;
  return Math.round(num);
}

function buildFieldOptions(fields: FieldDef[], customFields: CustomField[]): { key: string; fa: string }[] {
  return [
    ...fields.map(f => ({ key: f.key, fa: f.fa })),
    ...customFields.map(f => ({ key: f.key, fa: f.fa || f.label || f.key })),
  ];
}

function recordsToCompactJson(records: RecordItem[], fields: FieldDef[], customFields: CustomField[]): string {
  const options = buildFieldOptions(fields, customFields);
  const sample = records.slice(0, 30).map(r => {
    const obj: Record<string, string> = {};
    for (const o of options) {
      const val = getFieldValue(r, o.key);
      if (val) obj[o.key] = val;
    }
    return obj;
  });
  return JSON.stringify(sample, null, 2);
}

// ── Normalize API URL — ensures full endpoint path ──
export function normalizeApiUrl(input: string): string {
  let url = input.trim();
  // If user entered a base URL without /chat/completions, append it
  if (!url.endsWith('/chat/completions')) {
    // Remove trailing slash
    url = url.replace(/\/+$/, '');
    // If URL ends with /v1 or /v1/something, append /chat/completions
    if (!url.endsWith('/chat/completions')) {
      url = url + '/chat/completions';
    }
  }
  return url;
}

// ── CORS proxy: wraps URL through a proxy to bypass browser CORS restrictions ──
// Only needed when API server doesn't send Access-Control-Allow-Origin headers
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

function withCorsProxy(url: string, customProxy?: string): string {
  if (customProxy) {
    // If user entered a custom proxy, append the target URL
    return customProxy + encodeURIComponent(url);
  }
  return url;
}

// ── Fetch available models from API ──
export async function fetchAvailableModels(apiUrl: string, apiKey: string): Promise<string[]> {
  // Normalize first, then derive models URL
  const fullUrl = normalizeApiUrl(apiUrl);
  const baseUrls: string[] = [];

  try {
    const url = new URL(fullUrl);
    const origin = url.origin;

    // /v1/chat/completions -> /v1/models
    baseUrls.push(`${origin}/v1/models`);
    // /chat/completions -> /models
    baseUrls.push(`${origin}/models`);
    // preserve any prefix before /v1
    const match = url.pathname.match(/(\/.*\/)v1\//);
    if (match) {
      baseUrls.push(`${origin}${match[1]}v1/models`);
    }
  } catch {
    return [];
  }

  const uniqueUrls = [...new Set(baseUrls)];

  for (const modelsUrl of uniqueUrls) {
    try {
      const response = await fetch(modelsUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!response.ok) continue;
      const data = await response.json();
      const models = (data.data || data.models || [])
        .map((m: { id?: string; name?: string }) => m.id || m.name)
        .filter(Boolean);
      if (models.length > 0) {
        const known = models.filter((m: string) =>
          m.includes('gpt') || m.includes('claude') || m.includes('gemini') ||
          m.includes('deepseek') || m.includes('qwen') || m.includes('llama') ||
          m.includes('mistral') || m.includes('grok') || m.includes('phi'),
        );
        return known.length > 0 ? known : models;
      }
    } catch {
      continue;
    }
  }
  return [];
}

// ── AI Agent: converts raw records to proper accounting entries ──
export async function convertWithAIAgent(
  records: RecordItem[],
  fields: FieldDef[],
  customFields: CustomField[],
  apiUrl: string,
  apiKey: string,
  model: string,
): Promise<TaxBookEntry[]> {
  const sampleJson = recordsToCompactJson(records, fields, customFields);
  const totalRecords = records.length;

  const prompt = `You are an expert Iranian accounting agent. Convert raw business records into double-entry journal entries for the Iranian electronic legal books (دفاتر قانونی الکترونیکی).

OUTPUT FORMAT (9 columns — one JSON object per row):
{"genCode":"130100","genTitle":"حساب‌های دریافتنی","subCode":"130101","subTitle":"نام طرف حساب","desc":"فروش کالا به طرف حساب","debit":91653286,"credit":0,"date":"1403/02/15"}

FIELDS:
1. genCode — 6-digit general account code (e.g. 130100, 510100, 110100)
2. genTitle — Persian title of general account (e.g. حساب‌های دریافتنی, فروش, صندوق)
3. subCode — 6-digit subsidiary account code
4. subTitle — Persian title of subsidiary account (use party name or account description)
5. desc — Persian description/narration of the transaction (شرح معامله)
6. debit — debit amount in RIALS (actual amount, NOT divided)
7. credit — credit amount in RIALS (actual amount, NOT divided)
8. date — YYYY/MM/DD format (keep Jalali as-is)

ACCOUNTING RULES:
- EACH source record produces AT LEAST 2 journal entries (debit + credit).
- SALE/INVOICE → Debit: حساب‌های دریافتنی (130100), Credit: فروش (510100)
- PAYMENT/RECEIPT → Debit: صندوق (110100), Credit: حساب‌های دریافتنی (130100)
- EXPENSE → Debit: هزینه‌ها (610100), Credit: صندوق/پرداختنی (110100/310100)
- Use "party" field for subTitle (subsidiary account title).
- Use "type" field to choose correct accounts.
- AMOUNTS ARE IN RIALS — use the exact number (e.g. 91653286, not 91.65).
- Generate proper 6-digit codes following Iranian chart of accounts.

RECORDS TO CONVERT (ALL ${totalRecords} records — convert EVERY ONE):
${sampleJson}

OUTPUT: Return a JSON array with ALL journal entries for ALL records above.
Each record must have at least 2 entries (debit + credit). For ${totalRecords} records, expect at least ${totalRecords * 2} entries.

CRITICAL:
- Start with [ and end with ]
- ONLY the JSON array — no markdown, no explanation
- EVERY field is required: use "0" for numbers, "—" for text`;

  // Normalize URL — auto-append /chat/completions if missing
  const fullUrl = normalizeApiUrl(apiUrl);

  const requestBody = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: 'You are an accounting assistant. Output ONLY valid JSON arrays. No markdown. No explanation.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    max_tokens: 16000,
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  // Try direct first, then fall back to CORS proxies
  let response: Response | null = null;
  let lastError = '';

  // Attempt 1: Direct connection
  try {
    response = await fetch(fullUrl, { method: 'POST', headers, body: requestBody });
  } catch (err: unknown) {
    lastError = err instanceof Error ? err.message : String(err);
  }

  // Attempt 2-3: Try CORS proxies if direct failed
  if (!response) {
    for (const proxyFn of CORS_PROXIES) {
      const proxyUrl = proxyFn(fullUrl);
      try {
        response = await fetch(proxyUrl, { method: 'POST', headers, body: requestBody });
        if (response.ok) break; // success!
      } catch {
        continue;
      }
    }
  }

  if (!response) {
    throw new Error(
      `خطا در اتصال به API\n` +
      `آدرس: ${fullUrl}\n\n` +
      `مشکل: مرورگر درخواست را مسدود کرد (CORS)\n\n` +
      `راه‌حل‌ها:\n` +
      `1. از یک سرویس CORS proxy استفاده کنید:\n` +
      `   مثال: https://corsproxy.io/?${encodeURIComponent(fullUrl)}\n\n` +
      `2. آدرس proxy را در فیلد URL API وارد کنید:\n` +
      `   https://corsproxy.io/?${fullUrl}\n\n` +
      `3. از مدل‌های پشتیبانی‌شده OpenRouter استفاده کنید\n\n` +
      `خطای اصلی: ${lastError}`
    );
  }

  if (!response.ok) {
    let detail = '';
    try {
      const errBody = await response.json();
      detail = errBody.error?.message || JSON.stringify(errBody);
    } catch { /* ignore */ }
    const hint = response.status === 404
      ? `\nآدرس صحیح: ${fullUrl}\nنمونه صحیح:\n• OpenRouter: https://openrouter.ai/api/v1/chat/completions\n• OpenAI: https://api.openai.com/v1/chat/completions\n• 9router: http://localhost:20128/v1/chat/completions`
      : '';
    throw new Error(`خطای API (${response.status}): ${detail || response.statusText}${hint}`);
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    const preview = (await response.text()).slice(0, 300);
    throw new Error(
      `پاسخ API معتبر JSON نیست\n\n` +
      `پاسخ دریافتی:\n${preview || '(خالی)'}`
    );
  }
  const rawContent = (data as Record<string, unknown>)?.choices?.[0]?.message?.content || '';
  const content = String(rawContent);

  if (!content) {
    throw new Error('پاسخ AI خالی است — مدل پاسخی برنگرداند');
  }

  // Try multiple extraction strategies
  let parsed: unknown[] | null = null;

  // Strategy 1: Extract from markdown code block ```json ... ```
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      const inner = JSON.parse(codeBlockMatch[1].trim());
      if (Array.isArray(inner)) parsed = inner;
      else if (inner && typeof inner === 'object') parsed = [inner];
    } catch { /* try next */ }
  }

  // Strategy 2: Find raw JSON array (non-greedy)
  if (!parsed) {
    const arrayMatch = content.match(/\[[\s\S]*?\]/);
    if (arrayMatch) {
      try {
        const inner = JSON.parse(arrayMatch[0]);
        if (Array.isArray(inner)) parsed = inner;
      } catch { /* try next */ }
    }
  }

  // Strategy 3: Find the outermost array (greedy, last resort)
  if (!parsed) {
    const firstBracket = content.indexOf('[');
    const lastBracket = content.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        const inner = JSON.parse(content.substring(firstBracket, lastBracket + 1));
        if (Array.isArray(inner)) parsed = inner;
      } catch { /* failed */ }
    }
  }

  // Strategy 4: Single JSON object {…} — wrap in array
  if (!parsed) {
    try {
      const obj = JSON.parse(content.trim());
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        parsed = [obj];
      }
    } catch { /* try next */ }
  }

  // Strategy 5: Multiple JSON objects separated by newlines or commas
  if (!parsed) {
    try {
      const objects: unknown[] = [];
      // Try splitting by newlines
      const lines = content.split('\n').map(l => l.trim()).filter(l => l.startsWith('{'));
      for (const line of lines) {
        try {
          const obj = JSON.parse(line.replace(/,\s*$/, ''));
          if (obj && typeof obj === 'object') objects.push(obj);
        } catch { /* skip */ }
      }
      // Try splitting by },
      if (objects.length === 0) {
        const chunks = content.split(/\}\s*,?\s*\n?\s*\{/);
        for (let i = 0; i < chunks.length; i++) {
          let chunk = chunks[i].trim();
          if (!chunk.startsWith('{')) chunk = '{' + chunk;
          if (!chunk.endsWith('}')) chunk = chunk + '}';
          try {
            const obj = JSON.parse(chunk);
            if (obj && typeof obj === 'object') objects.push(obj);
          } catch { /* skip */ }
        }
      }
      if (objects.length > 0) parsed = objects;
    } catch { /* failed */ }
  }

  if (!parsed || parsed.length === 0) {
    // Show what the AI actually returned for debugging
    const preview = content.length > 300 ? content.substring(0, 300) + '...' : content;
    throw new Error(
      `AI response did not contain a valid JSON array\n\n` +
      `پاسخ دریافتی:\n${preview}`
    );
  }

  // Map source records back for reference
  const sourceMap = new Map<string, RecordItem>();
  for (const r of records) {
    sourceMap.set(r.code, r);
  }

  return parsed.map((entry: Record<string, unknown>) => ({
    genCode: String(entry.genCode || '0'),
    genTitle: String(entry.genTitle || '—'),
    subCode: String(entry.subCode || '0'),
    subTitle: String(entry.subTitle || '—'),
    desc: String(entry.desc || '—'),
    debit: Number(entry.debit) || 0,
    credit: Number(entry.credit) || 0,
    date: String(entry.date || '—'),
  }));
}

// ── Fallback: heuristic conversion without AI ──
export function convertHeuristic(
  records: RecordItem[],
  _fields: FieldDef[],
  _customFields: CustomField[],
): TaxBookEntry[] {
  const entries: TaxBookEntry[] = [];
  let partyCodeCounter = 1001;

  const partyCodeMap = new Map<string, string>();
  const partySubCounter = new Map<string, number>();

  for (const record of records) {
    const party = getFieldValue(record, 'party') || 'نامشخص';
    const type = getFieldValue(record, 'type') || '';
    const amount = toRials(getFieldValue(record, 'amount'));
    const date = getFieldValue(record, 'date') || '—';
    const project = getFieldValue(record, 'project') || '';

    // Assign party code
    if (!partyCodeMap.has(party)) {
      partyCodeMap.set(party, String(partyCodeCounter++));
      partySubCounter.set(party, 0);
    }
    const genCode = partyCodeMap.get(party)!;
    const subSeq = (partySubCounter.get(party) || 0) + 1;
    partySubCounter.set(party, subSeq);
    const subCode = `${genCode}${String(subSeq).padStart(2, '0')}`;

    // Determine account type from transaction type
    let debitGenCode = '130100';
    let debitGenTitle = 'حساب‌های دریافتنی';
    let debitSubTitle = party;
    let debitDesc = project || `فروش به ${party}`;
    let creditGenCode = '510100';
    let creditGenTitle = 'فروش';
    let creditSubTitle = 'فروش کالا';
    let creditDesc = `فروش کالا به ${party}`;

    const typeLower = type.toLowerCase();
    if (typeLower.includes('پرداخت') || typeLower.includes('هزینه') || typeLower.includes('expense')) {
      debitGenCode = '610100';
      debitGenTitle = 'هزینه‌ها';
      debitSubTitle = type || 'هزینه عمومی';
      debitDesc = project || type || 'هزینه عمومی';
      creditGenCode = '110100';
      creditGenTitle = 'صندوق';
      creditSubTitle = 'صندوق نقد';
      creditDesc = `پرداخت ${type || 'هزینه'}`;
    } else if (typeLower.includes('دریافت') || typeLower.includes('receipt') || typeLower.includes('collection')) {
      debitGenCode = '110100';
      debitGenTitle = 'صندوق';
      debitSubTitle = 'صندوق نقد';
      debitDesc = `دریافت از ${party}`;
      creditGenCode = '130100';
      creditGenTitle = 'حساب‌های دریافتنی';
      creditSubTitle = party;
      creditDesc = `دریافت از ${party}`;
    }

    // Debit entry
    entries.push({
      genCode: debitGenCode,
      genTitle: debitGenTitle,
      subCode,
      subTitle: debitSubTitle,
      desc: debitDesc,
      debit: amount,
      credit: 0,
      date,
    });

    // Credit entry
    entries.push({
      genCode: creditGenCode,
      genTitle: creditGenTitle,
      subCode,
      subTitle: creditSubTitle,
      desc: creditDesc,
      debit: 0,
      credit: amount,
      date,
    });
  }

  return entries;
}

// ── Generate Excel from entries ──
export function generateTaxBookExcel(entries: TaxBookEntry[], filename = 'tax_book_export.xlsx'): void {
  if (entries.length === 0) return;

  const data = entries.map((e, i) => ({
    'ردیف': i + 1,
    'تاریخ': e.date,
    'کد حساب کل': e.genCode,
    'عنوان حساب کل': e.genTitle,
    'کد حساب معین': e.subCode,
    'عنوان حساب معین': e.subTitle,
    'شرح': e.desc,
    'مبلغ بدهکار (ریال)': e.debit,
    'مبلغ بستانکار (ریال)': e.credit,
  }));

  const ws = XLSX.utils.json_to_sheet(data, { header: TAX_BOOK_HEADERS });

  ws['!cols'] = [
    { wch: 8 },  // ردیف
    { wch: 14 }, // تاریخ
    { wch: 14 }, // کد حساب کل
    { wch: 24 }, // عنوان حساب کل
    { wch: 14 }, // کد حساب معین
    { wch: 24 }, // عنوان حساب معین
    { wch: 30 }, // شرح
    { wch: 22 }, // مبلغ بدهکار
    { wch: 22 }, // مبلغ بستانکار
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'دفتر روزنامه');
  XLSX.writeFile(wb, filename);
}

// ── Preview data ──
export function getPreviewData(entries: TaxBookEntry[], maxRows = 10): Record<string, string>[] {
  return entries.slice(0, maxRows).map((e, i) => ({
    'ردیف': String(i + 1),
    'تاریخ': e.date,
    'کد حساب کل': e.genCode,
    'عنوان حساب کل': e.genTitle,
    'کد حساب معین': e.subCode,
    'عنوان حساب معین': e.subTitle,
    'شرح': e.desc,
    'مبلغ بدهکار': String(e.debit),
    'مبلغ بستانکار': String(e.credit),
  }));
}
