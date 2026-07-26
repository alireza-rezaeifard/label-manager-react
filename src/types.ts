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
  user_id?: number;
  workspace_id?: number;
  sort_order?: number;
  is_favorite?: boolean;
  notes?: string;
  deleted_at?: string;
  locked_by?: string;
  locked_at?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ValidationRule {
  type: 'regex' | 'min' | 'max' | 'required' | 'minLength' | 'maxLength' | 'email';
  value?: string | number;
  message?: string;
}

export interface CustomField {
  key: string;
  label: string;
  fa: string;
  type: string;
  options?: string[];
  required?: boolean;
  validationRules?: ValidationRule[];
}

export interface Comment {
  id: string;
  recordId: string;
  recordCode?: string;
  userId?: number;
  userName: string;
  text: string;
  mentions: string[];
  parentId?: string;
  createdAt: string;
  updatedAt?: string;
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

export interface Template {
  name: string;
  fields: RecordItem;
}

export interface Workspace {
  id: number;
  name: string;
  description?: string;
  created_by?: number;
  member_role?: string;
  member_count?: number;
  created_at?: string;
}

export interface AuthUser {
  id: number;
  username: string;
  role?: string;
}

export interface WorkspaceMember {
  id: number;
  username: string;
  user_role?: string;
  member_role?: string;
  joined_at?: string;
}

export type AuthUserOrNull = AuthUser | null;

export interface PrintHistoryEntry {
  date: string;
  time: string;
  count: number;
  codes: string[];
}
export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
}

export interface FilterState {
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  filterType?: string;
  filterParty?: string;
  selectedTagFilter?: string;
  filterDateFrom?: string;
  filterDateTo?: string;
  filterAmountMin?: string;
  filterAmountMax?: string;
}

export interface FormField {
  key: string;
  label: string;
  fa: string;
  placeholder?: string;
  isRelated?: boolean;
  isCustom?: boolean;
  fieldType?: string;
  options?: string[];
}

export interface ActivityLogEntry {
  id: number;
  action: string;
  details?: string;
  user_name?: string;
  created_at?: string;
  workspace_id?: number;
  record_id?: number;
}

export interface TaxBookMapping {
  row: null;
  date: string | null;
  genCode: null;
  genTitle: string | null;
  subCode: null;
  subTitle: string | null;
  desc: string | null;
  debit: string | null;
  credit: string | null;
}

export interface TaxBookColumn {
  key: keyof TaxBookMapping;
  fa: string;
  auto: boolean;
}

export interface TaxBookEntry {
  genCode: string;
  genTitle: string;
  subCode: string;
  subTitle: string;
  desc: string;
  debit: number;
  credit: number;
  date: string;
  sourceRecord?: RecordItem;
}
