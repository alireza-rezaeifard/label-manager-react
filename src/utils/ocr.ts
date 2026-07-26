interface OCRResult {
  text: string;
  confidence: number;
  fields: Record<string, string>;
}

function extractFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const lines = text.split('\n').filter(l => l.trim());

  const patterns: [RegExp, string][] = [
    /(?:invoice|facture|شماره فاکتور|شماره)\s*[::\-]?\s*([\w\-/]+)/i,
    /(?:date|تاریخ)\s*[::\-]?\s*([\d/]{4,}[\d/]*)/i,
    /(?:total|amount|جمع کل|مبلغ)\s*[::\-]?\s*([\d,]+)/i,
    /(?:customer|client|مشتری|طرف حساب)\s*[::\-]?\s*(.+)/i,
    /(?:project|پروژه)\s*[::\-]?\s*(.+)/i,
    /(?:tax|مالیات)\s*[::\-]?\s*([\d,]+)/i,
    /(?:discount|تخفیف)\s*[::\-]?\s*([\d,]+)/i,
  ];

  for (const [regex, key] of patterns) {
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        fields[key] = match[1].trim();
        break;
      }
    }
  }

  if (!fields.amount || !fields.party) {
    const numberPattern = /[\d,]{4,}/g;
    let numbers: string[] = [];
    for (const line of lines) {
      const found = line.match(numberPattern);
      if (found) numbers = [...numbers, ...found];
    }
    if (!fields.amount && numbers.length > 0) {
      const largest = numbers.reduce((a, b) => a.length >= b.length ? a : b);
      fields.amount = largest;
    }
    if (!fields.party && lines.length > 0) {
      const nonEmpty = lines.filter(l => l.length > 3 && !l.match(/^[\d\s:/\-]+$/));
      if (nonEmpty.length > 1) fields.party = nonEmpty[1];
    }
  }

  return fields;
}

export async function extractTextFromImage(file: File): Promise<OCRResult> {
  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const MAX_DIM = 2048;
  let w = img.width;
  let h = img.height;
  if (w > MAX_DIM || h > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  img.close();

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = gray > 128 ? 255 : 0;
  }
  ctx.putImageData(imageData, 0, 0);

  const base64 = canvas.toDataURL('image/png');
  const Tesseract = (window as any).Tesseract;

  let text = '';
  let confidence = 0;

  if (Tesseract) {
    try {
      const result = await Tesseract.recognize(base64, 'eng+fas', {
        logger: () => {},
      });
      text = result.data.text;
      confidence = result.data.confidence;
    } catch {
      text = 'OCR processing failed. Please try a clearer image.';
    }
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Tesseract.js'));
      document.head.appendChild(script);
    });
    const TesseractLoaded = (window as any).Tesseract;
    if (TesseractLoaded) {
      (window as any).Tesseract = TesseractLoaded;
      const result = await TesseractLoaded.recognize(base64, 'eng+fas', {
        logger: () => {},
      });
      text = result.data.text;
      confidence = result.data.confidence;
    }
  }

  const fields = extractFields(text);

  return { text, confidence, fields };
}
