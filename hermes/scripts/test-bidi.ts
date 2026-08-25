import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import shaper from 'arabic-persian-reshaper';

const FONT = path.join(process.cwd(), 'fonts/Vazirmatn-Regular.ttf');
const doc = new PDFDocument({ size: 'A4' });
const chunks: Buffer[] = [];
doc.on('data', (c: Buffer) => chunks.push(c));
doc.on('end', () => fs.writeFileSync('test-bidi.pdf', Buffer.concat(chunks)));
doc.registerFont('vazir', FONT);

const shape = (s: string) => (shaper as any).PersianShaper.convertArabic(s);
const isLatinish = (w: string) => /[A-Za-z0-9]/.test(w);

function visualRtl(line: string): string {
  const shaped = shape(line);
  return shaped
    .split(' ')
    .reverse()
    .map((w: string) => (isLatinish(w) ? w : [...w].reverse().join('')))
    .join(' ');
}

const rows: Array<[string, string]> = [
  ['1 start',  visualRtl('PROJ000 ????? ?????')],
  ['2 mid',    visualRtl('???? ??: ??? ABC-456')],
  ['3 multi',  visualRtl('TaxBook ? HR-1405 ?? PROJ000')],
  ['4 end',    visualRtl('???? ????: TaxBook')],
  ['5 plain',  visualRtl('???????? ????????: ???')],
  ['6 date',   visualRtl('????: ????/??/?? ?? ????/??/??')],
];

let yy = 70;
for (const [tag, content] of rows) {
  doc.font('vazir').fontSize(13).fillColor('#000')
    .text(content, 56, yy, { width: 480, align: 'right' });
  yy += 40;
}
doc.end();
console.log('done');
