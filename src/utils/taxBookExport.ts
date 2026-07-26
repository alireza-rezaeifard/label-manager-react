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
const BATCH_SIZE = 25;

function buildPrompt(recordsJson: string, batchNum: number, totalBatches: number, totalRecords: number): string {
  return `You are an expert Iranian accounting agent. Convert these business records into double-entry journal entries for دفاتر قانونی الکترونیکی.
${totalBatches > 1 ? `\nTHIS IS BATCH ${batchNum}/${totalBatches} (${totalRecords} total records, batches of ${BATCH_SIZE}).` : ''}

OUTPUT: one JSON object per row:
{"genCode":"130100","genTitle":"حساب‌های دریافتنی","subCode":"130101","subTitle":"نام طرف حساب","desc":"فروش کالا","debit":91653286,"credit":0,"date":"1403/02/15"}

FIELDS:
1. genCode — 6-digit general account code (130100, 510100, 110100, 610100, 310100)
2. genTitle — Persian general account title
3. subCode — 6-digit subsidiary code
4. subTitle — MUST BE THE PARTY NAME (نام شخص/شرکت from "party" field). NEVER use transaction type here.
5. desc — Persian narration (شرح)
6. debit — RIALS (exact, e.g. 91653286)
7. credit — RIALS (exact)
8. date — YYYY/MM/DD

RULES:
- subTitle = ALWAYS the party name (person or company). Example: party="زهرا یابری" → subTitle="زهرا یابری"
- NEVER use "سرویس کولر", "پرداخت سرویس" etc. as subTitle — those go in "desc"
- EACH record → AT LEAST 2 entries (debit + credit)
- SALE → Dr: حساب‌های دریافتنی (130100) / Cr: فروش (510100)
- PAYMENT → Dr: صندوق (110100) / Cr: حساب‌های دریافتنی (130100)
- EXPENSE → Dr: هزینه‌ها (610100) / Cr: صندوق/پرداختنی (110100/310100)

RECORDS:
${recordsJson}

Return ONLY the JSON array. No markdown. [ ... ]`;
}

async function callAIWithRetry(
  fullUrl: string, headers: Record<string, string>, body: string, corsProxy: string = '',
): Promise<Response> {
  let lastError = '';

  // Skip proxy for localhost — no CORS needed
  const isLocal = fullUrl.includes('localhost') || fullUrl.includes('127.0.0.1');

  // 1: Custom proxy (only for non-local)
  if (corsProxy && !isLocal) {
    try {
      let proxyUrl: string;
      if (fullUrl.startsWith(corsProxy)) {
        proxyUrl = fullUrl;
      } else {
        const sep = corsProxy.includes('?') ? '' : (corsProxy.endsWith('/') ? '' : '/');
        proxyUrl = corsProxy + sep + fullUrl;
      }
      const r = await fetch(proxyUrl, { method: 'POST', headers, body });
      if (r.ok) return r;
      lastError = `Proxy responded ${r.status}`;
    } catch (e: any) { lastError = e.message || 'proxy failed'; }
  }

  // 2: Direct
  try {
    const r = await fetch(fullUrl, { method: 'POST', headers, body });
    if (r.ok) return r;
    lastError = `Direct responded ${r.status}`;
  } catch (e: any) {
    lastError = e.message || 'direct failed';
  }

  // 3: Built-in CORS proxies (non-local only)
  if (!isLocal) {
    for (const proxyFn of CORS_PROXIES) {
      try {
        const r = await fetch(proxyFn(fullUrl), { method: 'POST', headers, body });
        if (r.ok) return r;
      } catch { continue; }
    }
  }

  throw new Error(lastError || 'FAILED');
}

function extractEntries(content: string): unknown[] | null {
  // 1: code block
  const m1 = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (m1) { try { const a = JSON.parse(m1[1].trim()); if (Array.isArray(a)) return a; if (a && typeof a === 'object') return [a]; } catch {} }
  // 2: raw array
  const m2 = content.match(/\[[\s\S]*?\]/);
  if (m2) { try { const a = JSON.parse(m2[0]); if (Array.isArray(a)) return a; } catch {} }
  // 3: outermost brackets
  const fi = content.indexOf('['), li = content.lastIndexOf(']');
  if (fi !== -1 && li > fi) { try { const a = JSON.parse(content.substring(fi, li + 1)); if (Array.isArray(a)) return a; } catch {} }
  // 4: single object
  try { const o = JSON.parse(content.trim()); if (o && typeof o === 'object' && !Array.isArray(o)) return [o]; } catch {}
  return null;
}

export async function convertWithAIAgent(
  records: RecordItem[],
  fields: FieldDef[],
  customFields: CustomField[],
  apiUrl: string,
  apiKey: string,
  model: string,
  corsProxy: string = '',
  onProgress?: (current: number, total: number, msg: string) => void,
): Promise<TaxBookEntry[]> {
  const fullUrl = normalizeApiUrl(apiUrl);
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };

  const batches: RecordItem[][] = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) batches.push(records.slice(i, i + BATCH_SIZE));
  const totalBatches = batches.length;
  const allEntries: TaxBookEntry[] = [];

  for (let bi = 0; bi < totalBatches; bi++) {
    const batch = batches[bi];
    const sampleJson = recordsToCompactJson(batch, fields, customFields);
    onProgress?.(bi + 1, totalBatches, `پردازش دسته ${bi + 1} از ${totalBatches}...`);

    const prompt = buildPrompt(sampleJson, bi + 1, totalBatches, records.length);
    const requestBody = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an accounting assistant. Output ONLY valid JSON arrays. No markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 32000,
    });

    let response: Response;
    try {
      response = await callAIWithRetry(fullUrl, headers, requestBody, corsProxy);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `خطا در اتصال به API (دسته ${bi + 1}/${totalBatches}):\n${errMsg}\n\n` +
        `آدرس: ${fullUrl}\n` +
        `اگر مشکل CORS است، proxy-server.cjs را اجرا کنید\n` +
        `و در تنظیمات CORS Proxy را http://localhost:3002/ قرار دهید.`
      );
    }

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch {}
      throw new Error(`خطای API (${response.status}) دسته ${bi + 1}: ${detail || response.statusText}`);
    }

    const rawText = await response.text();

    // Handle SSE format: "data: {...}\n\ndata: [DONE]"
    let jsonStr = rawText;
    if (rawText.startsWith('data: ')) {
      const lines = rawText.split('\n');
      const dataLines = lines.filter(l => l.startsWith('data: ') && !l.includes('[DONE]'));
      // Use last data line (contains full response)
      if (dataLines.length > 0) {
        jsonStr = dataLines[dataLines.length - 1].replace(/^data: /, '');
      }
    }

    let data: Record<string, unknown>;
    try { data = JSON.parse(jsonStr); } catch {
      throw new Error(`پاسخ JSON نیست (دسته ${bi + 1}):\n${rawText.slice(0, 500) || '(خالی)'}`);
    }

    const content = String((data as any)?.choices?.[0]?.message?.content || '');
    if (!content) throw new Error(`پاسخ AI خالی است (دسته ${bi + 1})`);

    // content might be a JSON string like "[{...}]" — parse it
    let parsed: unknown[] | null = null;
    const trimmed = content.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const inner = JSON.parse(trimmed);
        parsed = Array.isArray(inner) ? inner : [inner];
      } catch { /* not JSON, try extractEntries */ }
    }
    if (!parsed) {
      parsed = extractEntries(content);
    }
    if (!parsed) throw new Error(`پاسخ AI قابل پارس نیست (دسته ${bi + 1}):\n${content.slice(0, 300)}`);

    for (const entry of parsed) {
      const e = entry as Record<string, unknown>;
      allEntries.push({
        genCode: String(e.genCode || '0'),
        genTitle: String(e.genTitle || '—'),
        subCode: String(e.subCode || '0'),
        subTitle: String(e.subTitle || '—'),
        desc: String(e.desc || '—'),
        debit: Number(e.debit) || 0,
        credit: Number(e.credit) || 0,
        date: String(e.date || '—'),
      });
    }
  }

  onProgress?.(totalBatches, totalBatches, 'تبدیل کامل شد!');
  return allEntries;
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
      debitSubTitle = party;
      debitDesc = project || type || 'هزینه عمومی';
      creditGenCode = '110100';
      creditGenTitle = 'صندوق';
      creditSubTitle = 'صندوق نقد';
      creditDesc = `پرداخت به ${party} - ${type || 'هزینه'}`;
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
