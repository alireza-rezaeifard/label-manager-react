exports.up = function(db) {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_records_code ON records(code);
    CREATE INDEX IF NOT EXISTS idx_records_project ON records(project);
    CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
    CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
    CREATE INDEX IF NOT EXISTS idx_records_party ON records(party);
    CREATE INDEX IF NOT EXISTS idx_records_workspace_id ON records(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
    CREATE INDEX IF NOT EXISTS idx_records_sort_order ON records(sort_order);
    CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON activity_log(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_record_versions_record_id ON record_versions(record_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_custom_fields_workspace_id ON custom_fields(workspace_id);
  `);
};
