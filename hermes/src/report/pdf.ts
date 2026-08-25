import PDFDocument from 'pdfkit';
import { toJalaliString, JALALI_MONTHS } from './jalali.js';

/* ══════════════════════════════════════════════════════════════════════
   Persian RTL PDF report generator.

   Uses pdfkit + Vazirmatn (OpenType, full Arabic-script GSUB) so Persian
   text is shaped and joined correctly. Lines are laid out right-to-left
   via pdfkit's `features: ['rtla']`. No base64 in chat — the buffer is
   returned to the tool layer which ships it through the artifact channel.
   ══════════════════════════════════════════════════════════════════════ */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_REGULAR = path.join(__dirname, '../../fonts/Vazirmatn-Regular.ttf');
const FONT_BOLD = path.join(__dirname, '../../fonts/Vazirmatn-Bold.ttf');

export interface ReportData {
  title: string;
  workspaceName: string;
  period: { start: string; end: string; jy: number; jm: number };
  summary: { created: number; updated: number; deleted: number; restored: number };
  activities: Array<{ user: string; action: string; details: string; created_at: string }>;
  projects: Array<{ name: string; count: number; totalAmount: number }>;
  generatedAt: string;
}

const ACTION_FA: Record<string, string> = {
  create: 'ایجاد',
  update: 'ویرایش',
  delete: 'حذف',
  restore: 'بازیابی',
  'bulk-edit': 'ویرایش گروهی',
  reorder: 'جابجایی',
};

const faNum = (n: number | string) => Number(n || 0).toLocaleString('fa-IR');
const faAmount = (n: number | string) => Number(n || 0).toLocaleString('fa-IR');

export function renderReportPdf(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 56, bottom: 56, left: 56, right: 56 },
      info: { Title: data.title, Creator: 'Hermes — TaxBook' },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      doc.registerFont('vazir', FONT_REGULAR);
      doc.registerFont('vazir-bold', FONT_BOLD);
    } catch (err) {
      reject(new Error(`Persian font could not be loaded: ${(err as Error).message}`));
      return;
    }

const RTL = ['rtla'] as PDFKit.Mixins.TextOptions['features'];
const pageLeft = doc.page.margins.left;
const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

/* fontkit's `rtla` flips word order for lines that START with an RTL char and
   also reverses LTR (Latin) runs inside them; lines starting with LTR only get
   word-order flipped. So Latin runs need pre-reversal exclusively in
   RTL-led lines. Empirically verified against Vazirmatn + pdfkit. */
const RTL_LED = /^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
function rtlLine(line: string): string {
  if (!line || !RTL_LED.test(line)) return line;
  return line.replace(
    /[A-Za-z][A-Za-z0-9 _./:-]*[A-Za-z0-9]|[A-Za-z]/g,
    m => [...m].reverse().join('') + ' '
  );
}

type TextOpts = {
  size?: number;
  bold?: boolean;
  color?: string;
  y?: number;
  align?: 'left' | 'right' | 'center';
  width?: number;
};

const text = (str: string, opts: TextOpts = {}) => {
  const y = opts.y ?? doc.y;
  doc.font(opts.bold ? 'vazir-bold' : 'vazir')
    .fontSize(opts.size ?? 11)
    .fillColor(opts.color || '#1f2937')
    .text(rtlLine(str), pageLeft, y, {
      features: RTL,
      width: opts.width ?? pageWidth,
      align: opts.align ?? 'right',
    });
};

    const hr = (y?: number) => {
      const yy = y ?? doc.y + 8;
      doc.moveTo(pageLeft, yy).lineTo(pageLeft + pageWidth, yy).lineWidth(0.75).strokeColor('#d1d5db').stroke();
      doc.y = yy + 14;
    };

    /* ── Header ── */
    doc.rect(0, 0, doc.page.width, 110).fill('#0f766e');
    doc.font('vazir-bold').fontSize(20).fillColor('#ffffff')
      .text('TaxBook', pageLeft, 30, { width: pageWidth, align: 'center' });
    doc.font('vazir').fontSize(12).fillColor('#ccfbf1')
      .text('گزارش تغییرات ماهانه', pageLeft, 60, { features: RTL, width: pageWidth, align: 'center' });
    doc.y = 130;

    const monthName = JALALI_MONTHS[data.period.jm - 1];
    text(`گزارش تغییرات ${monthName} ${faNum(data.period.jy)}`, { size: 16, bold: true, align: 'center' });
    doc.moveDown(0.4);
    text(
      `بازه: ${toJalaliString(data.period.start)} تا ${toJalaliString(data.period.end)}`,
      { size: 10.5, color: '#6b7280', align: 'center' }
    );
    text(`فضای کاری: ${data.workspaceName}`, { size: 10.5, color: '#6b7280', align: 'center' });
    doc.moveDown(0.8);
    hr();

    /* ── Summary ── */
    text('خلاصه', { size: 13, bold: true });
    doc.moveDown(0.4);
    const summaryRows: Array<[string, number]> = [
      ['رکوردهای ایجادشده:', data.summary.created],
      ['رکوردهای ویرایششده:', data.summary.updated],
      ['رکوردهای حذفشده:', data.summary.deleted],
      ['رکوردهای بازیابیشده:', data.summary.restored],
    ];
    for (const [label, value] of summaryRows) {
      const y = doc.y;
      text(label, { size: 11, y });
      doc.font('vazir-bold').fontSize(11).fillColor('#0f766e')
        .text(faNum(value), pageLeft, y, { width: pageWidth, align: 'left' });
      doc.y = y + 20;
    }
    doc.moveDown(0.6);
    hr();

    /* ── Projects ── */
    text('پروژهها', { size: 13, bold: true });
    doc.moveDown(0.4);
    if (data.projects.length === 0) {
      text('پروژهی ثبتشدهای وجود ندارد.', { size: 10.5, color: '#6b7280' });
    } else {
      for (const p of data.projects.slice(0, 12)) {
        const y = doc.y;
        text(p.name || 'بدون نام', { size: 11, y });
        doc.font('vazir').fontSize(10.5).fillColor('#6b7280')
          .text(
            rtlLine(`${faNum(p.count)} رکورد — مجموع ${faAmount(p.totalAmount)}`),
            pageLeft, y, { features: RTL, width: pageWidth, align: 'left' }
          );
        doc.y = y + 18;
      }
    }
    doc.moveDown(0.6);
    hr();

    /* ── Important activities ── */
    text('فعالیتهای مهم', { size: 13, bold: true });
    doc.moveDown(0.4);
    if (data.activities.length === 0) {
      text('در این بازه فعالیتی ثبت نشده است.', { size: 10.5, color: '#6b7280' });
    } else {
      for (const a of data.activities.slice(0, 20)) {
        const actionFa = ACTION_FA[a.action] || a.action;
        const dateFa = a.created_at ? toJalaliString(String(a.created_at).slice(0, 10)) : '';
        text(
          `${actionFa}${a.details ? ' — ' + a.details : ''} (${a.user || 'کاربر'}) • ${dateFa}`,
          { size: 10, color: '#374151' }
        );
        doc.moveDown(0.25);
      }
    }
    doc.moveDown(0.8);
    hr();

    /* ── Footer ── */
    text('گزارش تولید شده توسط Hermes', { size: 9.5, color: '#9ca3af', align: 'center' });
    const genJ = toJalaliString(data.generatedAt.slice(0, 10));
    text(`تاریخ تولید: ${genJ}`, { size: 9.5, color: '#9ca3af', align: 'center' });

    doc.end();
  });
}
