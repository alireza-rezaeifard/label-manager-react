/* eslint-disable */
/**
 * AUTO-GENERATED from the backend OpenAPI spec — do not edit by hand.
 * Regenerate with: npm run generate:api-types
 * Source: server/swagger.js
 */
export interface Error {
    "error"?: string;
    "code"?: string;
}

export interface Record {
    "id"?: number;
    "code"?: string;
    "project"?: string;
    "type"?: string;
    "date"?: string;
    "party"?: string;
    "amount"?: string;
    "related"?: Array<string>;
    "tags"?: Array<string>;
    "image"?: string;
    "color"?: string;
    "sort_order"?: number;
    "workspace_id"?: number;
    "user_id"?: number;
    "created_at"?: string;
    "updated_at"?: string;
}

export interface Workspace {
    "id"?: number;
    "name"?: string;
    "description"?: string;
    "created_by"?: number;
    "created_at"?: string;
    "member_role"?: string;
    "member_count"?: number;
}

export interface WorkspaceMember {
    "id"?: number;
    "username"?: string;
    "user_role"?: string;
    "member_role"?: string;
    "joined_at"?: string;
}

export interface CustomField {
    "key"?: string;
    "label"?: string;
    "fa"?: string;
    "placeholder"?: string;
    "fieldType"?: string;
    "options"?: Array<string>;
    "isCustom"?: boolean;
}

export interface ActivityLog {
    "id"?: number;
    "user_id"?: number;
    "workspace_id"?: number;
    "action"?: string;
    "details"?: string;
    "record_id"?: number;
    "created_at"?: string;
}

export interface RecordVersion {
    "id"?: number;
    "record_id"?: number;
    "user_name"?: string;
    "change_summary"?: string;
    "created_at"?: string;
}

/** Registry of all component schemas, mirroring the OpenAPI document. */
export interface components {
  schemas: {
    Error: Error;
    Record: Record;
    Workspace: Workspace;
    WorkspaceMember: WorkspaceMember;
    CustomField: CustomField;
    ActivityLog: ActivityLog;
    RecordVersion: RecordVersion;
  };
}
