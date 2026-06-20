export interface FieldDef {
  key: string;
  label: string;
  fa: string;
  placeholder?: string;
  isRelated?: boolean;
}

export interface RecordItem {
  code: string;
  project: string;
  type: string;
  date: string;
  party: string;
  amount: string;
  related: string[];
  tags?: string[];
  image?: string;
  color?: string;
  id?: string;
  is_favorite?: boolean;
  notes?: string;
  deleted_at?: string;
  locked_by?: string;
  locked_at?: string;
  [key: string]: unknown;
}

export interface CustomField {
  key: string;
  label: string;
  fa: string;
  type: string;
  options?: string[];
  required?: boolean;
}

export interface Snapshot {
  records: RecordItem[];
  label: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  timestamp: string;
  user?: string;
  details?: string;
}

export interface ToastType {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  exiting?: boolean;
}

export type Record = RecordItem;
