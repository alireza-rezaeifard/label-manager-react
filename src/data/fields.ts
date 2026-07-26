export const FIELDS = [
  { key: "code",    label: "Code",    fa: "کد",      placeholder: "e.g. INV-2024-001" },
  { key: "project", label: "Project", fa: "پروژه",   placeholder: "e.g. Office Renovation" },
  { key: "type",    label: "Type",    fa: "نوع",      placeholder: "e.g. Invoice" },
  { key: "date",    label: "Date",    fa: "تاریخ",    placeholder: "e.g. 1403/02/15" },
  { key: "party",   label: "Party",   fa: "طرف حساب", placeholder: "e.g. Vendor Name" },
  { key: "amount",  label: "Amount",  fa: "مبلغ",     placeholder: "e.g. 5,000,000" },
  { key: "related", label: "Related", fa: "مرتبط",    placeholder: "e.g. Contract #42", isRelated: true },
];

export const LABEL_PRINT_COLS = 3;
export const LABEL_WIDTH = 180;
export const LABEL_HEIGHT = 130;
export const PAGE_SIZE = 50;

export const EMPTY_FORM = Object.fromEntries(
  FIELDS.map(f => [f.key, f.key === 'related' ? [] : ''])
);

export const CSV_TEMPLATE = [
  FIELDS.map(f => f.key).join(","),
  'INV-2024-001,Office Renovation,Invoice,1403/02/15,Vendor Co,5000000,"CONTRACT-001,CONTRACT-002"',
].join("\n");
