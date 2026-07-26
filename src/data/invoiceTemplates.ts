export interface InvoiceTemplateDef {
  name: string;
  description: string;
  fields: Record<string, string>;
  customFields?: { key: string; label: string; fa: string; type: string }[];
}

export const INVOICE_TEMPLATES: InvoiceTemplateDef[] = [
  {
    name: "Invoice Simple",
    description: "Simple invoice with vendor, customer, amount, and date",
    fields: {
      code: "INV-{YEAR}-{SEQ:0001}",
      project: "Project Name",
      type: "Invoice",
      date: "{TODAY}",
      party: "Customer Name",
      amount: "0",
    },
  },
  {
    name: "Invoice Standard",
    description: "Standard invoice with tax, discount, and line items",
    fields: {
      code: "INV-{YEAR}-{SEQ:0001}",
      project: "Project / Department",
      type: "Invoice",
      date: "{TODAY}",
      party: "Client / Company",
      amount: "0",
    },
    customFields: [
      { key: "tax_rate", label: "Tax Rate", fa: "نرخ مالیات", type: "number" },
      { key: "discount", label: "Discount", fa: "تخفیف", type: "number" },
      { key: "due_date", label: "Due Date", fa: "سررسید", type: "date" },
      { key: "invoice_status", label: "Status", fa: "وضعیت", type: "dropdown" },
    ],
  },
  {
    name: "Purchase Order",
    description: "Purchase order with items, delivery date, and terms",
    fields: {
      code: "PO-{YEAR}-{SEQ:0001}",
      project: "Procurement",
      type: "Purchase Order",
      date: "{TODAY}",
      party: "Supplier Name",
      amount: "0",
    },
    customFields: [
      { key: "delivery_date", label: "Delivery Date", fa: "تاریخ تحویل", type: "date" },
      { key: "payment_terms", label: "Payment Terms", fa: "شرایط پرداخت", type: "text" },
      { key: "shipping_method", label: "Shipping Method", fa: "روش ارسال", type: "dropdown" },
    ],
  },
  {
    name: "Receipt",
    description: "Simple receipt template for quick transactions",
    fields: {
      code: "RCT-{YEAR}-{SEQ:0001}",
      project: "Point of Sale",
      type: "Receipt",
      date: "{TODAY}",
      party: "Customer",
      amount: "0",
    },
    customFields: [
      { key: "payment_method", label: "Payment Method", fa: "روش پرداخت", type: "dropdown" },
      { key: "reference", label: "Reference", fa: "مرجع", type: "text" },
    ],
  },
  {
    name: "Credit Note",
    description: "Credit note / refund document",
    fields: {
      code: "CN-{YEAR}-{SEQ:0001}",
      project: "Refunds",
      type: "Credit Note",
      date: "{TODAY}",
      party: "Customer Name",
      amount: "0",
    },
    customFields: [
      { key: "original_invoice", label: "Original Invoice", fa: "فاکتور اصلی", type: "text" },
      { key: "reason", label: "Reason", fa: "دلیل", type: "text" },
    ],
  },
  {
    name: "Proforma Invoice",
    description: "Proforma invoice for quotations before billing",
    fields: {
      code: "PRO-{YEAR}-{SEQ:0001}",
      project: "Quotation",
      type: "Proforma",
      date: "{TODAY}",
      party: "Potential Client",
      amount: "0",
    },
    customFields: [
      { key: "valid_until", label: "Valid Until", fa: "اعتبار تا", type: "date" },
      { key: "payment_terms", label: "Payment Terms", fa: "شرایط پرداخت", type: "text" },
    ],
  },
];

export const SAMPLE_INVOICE_DATA = {
  code: "INV-1403-0042",
  project: "Office Renovation - Phase 2",
  type: "Invoice",
  date: "1403/05/18",
  party: "Alborz Construction Co.",
  amount: "187,500,000",
  related: ["CON-1403-0012", "PO-1403-0089"],
  tags: ["urgent", "construction", "paid"],
  notes: "Final payment for office renovation project. Includes materials and labor.",
};
