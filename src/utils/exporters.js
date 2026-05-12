import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";


const TEMPLATES = {
  classic: {
    name: 'کلاسیک',
    getLabelHtml: (r, fields) => `
      <div class="label-header">${r.code}</div>
      <div class="label-row-content">
        ${fields.filter(f => f.key !== "code").map(f => `
          ${f.key === "related" ? (r.related && r.related.length > 0 ? `
            <div class="label-field" style="margin-top: 4px;">
              <span class="label-key">${f.fa}:</span>
              <div class="label-related">${r.related.map(c => `<span class="label-related-badge">${c}</span>`).join('')}</div>
            </div>` : '')
          : `
            <div class="label-field">
              <span class="label-key">${f.fa}:</span>
              <span class="label-value">${r[f.key] || ""}</span>
            </div>`}`
        ).join('')}
      </div>`,
  },
  compact: {
    name: 'فشرده',
    getLabelHtml: (r, fields) => `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
        <div style="font-weight:bold;font-size:14px;font-family:monospace;flex:1;">${r.code}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;font-size:10px;">
        ${fields.filter(f => f.key !== "code" && f.key !== "related").map(f => `
          <div style="display:flex;gap:4px;">
            <span style="font-weight:bold;color:#666;min-width:40px;">${f.fa}:</span>
            <span style="text-align:right;">${r[f.key] || ""}</span>
          </div>`).join('')}
      </div>`,
  },
  detailed: {
    name: 'جزئیات کامل',
    getLabelHtml: (r, fields) => `
      <div class="label-header">${r.code}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">
        ${fields.filter(f => f.key !== "code" && f.key !== "related").map(f => `
          <div>
            <div style="font-weight:bold;color:#666;font-size:9px;text-transform:uppercase;">${f.fa}</div>
            <div>${r[f.key] || ""}</div>
          </div>`).join('')}
      </div>
      ${r.related && r.related.length > 0 ? `
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid #eee;">
          <div style="font-weight:bold;color:#666;font-size:9px;">مرتبط:</div>
          <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;">
            ${r.related.map(c => `<span style="background:#7367f0;color:#fff;padding:2px 6px;border-radius:3px;font-size:9px;font-family:monospace;">${c}</span>`).join('')}
          </div>
        </div>` : ''}`,
  },
};

export { TEMPLATES };

export const downloadTemplate = (fields, template) => {
  const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "labels_template.csv";
  a.click();
};

export const downloadExcel = (records, fields) => {
  const data = records.map(r => {
    const row = {};
    fields.forEach(f => {
      row[f.fa] = f.key === "related" ? (r.related ? r.related.join(', ') : "") : (r[f.key] || "");
    });
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = fields.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "برچسب‌ها");
  XLSX.writeFile(wb, "labels_export.xlsx");
};

export const downloadPDF = async (element) => {
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210;
  const pageHeight = 295;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save('labels_export.pdf');
};

function encodeBarcodeData(r) {
  const val = v => (v ?? '').replace(/"/g, "'");
  return `C:${val(r.code)} P:${val(r.project)} T:${val(r.type)} D:${val(r.date)} A:${val(r.party)} M:${val(r.amount)}`;
}

export const getPrintHtml = (records, fields, cols, width, height, templateKey = 'classic', showQr = false, showBarcode = false) => {
  const template = TEMPLATES[templateKey] || TEMPLATES.classic;
  const totalRows = Math.ceil(records.length / cols);
  const gapSize = 12;

  const qrScript = showQr ? `
    <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('[data-qr]').forEach(function(el) {
        new QRCode(el, { text: el.getAttribute('data-qr'), width: 100, height: 100 });
      });
    });
    </script>` : '';

  const barcodeScript = showBarcode ? `
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('[data-barcode]').forEach(function(el) {
        JsBarcode(el, el.getAttribute('data-barcode'), {
          format: 'CODE128',
          width: 1.5,
          height: 36,
          displayValue: false,
          margin: 4,
        });
      });
    });
    </script>` : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <title>برچسب‌ها</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Tahoma, Arial, sans-serif; padding: 15mm; background: #fff; direction: rtl; }
    .page { display: flex; flex-direction: column; gap: 0; }
    .label-row { display: flex; gap: ${gapSize}px; margin-bottom: ${gapSize}px; align-items: flex-start; direction: rtl; }
    .label-wrapper { position: relative; }
    .cut-indicator { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 18px; color: #999; z-index: 100; }
    .label { width: ${width + 20}px; min-height: ${height}px; border: 2px dashed #ccc; padding: 12px; display: flex; flex-direction: column; gap: 4px; break-inside: avoid; font-family: Tahoma; font-size: 11px; background: #fff; color: #333; direction: rtl; }
    .label-header { font-weight: bold; font-size: 13px; font-family: Consolas, monospace; text-align: center; padding-bottom: 8px; margin-bottom: 4px; border-bottom: 1px solid #eee; direction: ltr; unicode-bidi: embed; }
    .label-row-content { display: flex; flex-direction: column; gap: 3px; }
    .label-field { display: flex; justify-content: space-between; align-items: baseline; direction: rtl; }
    .label-key { font-weight: bold; color: #666; min-width: 55px; direction: rtl; }
    .label-value { text-align: right; max-width: 100px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; direction: rtl; }
    .label-related { display: flex; flex-wrap: wrap; gap: 3px; justify-content: flex-end; margin-top: 4px; direction: ltr; }
    .label-related-badge { background: #7c3aed; color: #fff; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-family: monospace; }
    .empty-cell { width: ${width + 20}px; height: ${height}px; }
    .qr-placeholder { width: 100px; height: 100px; border: 1px solid #ddd; border-radius: 4px; flex-shrink: 0; }
    @page { size: A4; margin: 10mm; }
    @media print { body { padding: 10mm !important; } .label { border: 1px solid #333 !important; } .cut-indicator { display: none !important; } .empty-cell { border: 1px dashed #ddd; } }
  </style>
</head>
<body>
  <div class="page">
    ${Array.from({ length: totalRows }, (_, row) => {
      const rowLabels = records.slice(row * cols, (row + 1) * cols);
      return `<div class="label-row">` +
        rowLabels.map((r) => {
          const labelContent = template.getLabelHtml(r, fields);
          let content = labelContent;
          if (showQr && showBarcode) {
            const barcodeData = encodeBarcodeData(r);
            content = `<div style="display:flex;gap:8px;align-items:flex-start;"><div style="flex:1;min-width:0;">${labelContent}</div><div class="qr-placeholder" data-qr="${encodeBarcodeData(r)}"></div></div><div style="margin-top:6px;text-align:center;"><svg data-barcode="${barcodeData}"></svg></div>`;
          } else if (showQr) {
            content = `<div style="display:flex;gap:8px;align-items:flex-start;"><div style="flex:1;min-width:0;">${labelContent}</div><div class="qr-placeholder" data-qr="${encodeBarcodeData(r)}"></div></div>`;
          } else if (showBarcode) {
            const barcodeData = encodeBarcodeData(r);
            content = `${labelContent}<div style="margin-top:6px;text-align:center;"><svg data-barcode="${barcodeData}"></svg></div>`;
          }
          return `<div class="label-wrapper"><span class="cut-indicator">✂</span><div class="label">${content}</div></div>`;
        }).join('') +
        Array(cols - rowLabels.length).fill(`<div class="empty-cell"></div>`).join('') +
        `</div>`;
    }).join('')}
  </div>
  ${qrScript}
  ${barcodeScript}
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
};

export const printLabels = (records, fields, cols, width, height, templateKey, showQr, showBarcode) => {
  const html = getPrintHtml(records, fields, cols, width, height, templateKey, showQr, showBarcode);
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
};
