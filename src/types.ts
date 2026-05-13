export interface Record {
  id?: number;
  code: string;
  project: string;
  type?: string;
  date?: string;
  party?: string;
  amount?: string;
  related?: string[];
  tags?: string[];
  image?: string;
  color?: string;
  sort_order?: number;
  user_id?: number;
  workspace_id?: number;
  created_at?: string;
  updated_at?: string;
  __lid?: number;
}

export interface FieldDef {
  key: string;
  label: string;
  fa: string;
  placeholder?: string;
  isRelated?: boolean;
  isCustom?: boolean;
}

export interface ToastType {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface TemplateDef {
  name: string;
  fields: string[];
  icon?: string;
}
