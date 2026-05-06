-- Performance indexes for frequently queried foreign key columns.
-- These columns appear in WHERE clauses of hot-path queries but had no indexes.

CREATE INDEX IF NOT EXISTS idx_itp_points_instance_id ON itp_points(instance_id);
CREATE INDEX IF NOT EXISTS idx_ncr_defects_itp_point_id ON ncr_defects(itp_point_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_itp_point_id ON audit_logs(itp_point_id);
CREATE INDEX IF NOT EXISTS idx_media_itp_point_id ON media(itp_point_id);
CREATE INDEX IF NOT EXISTS idx_wp_notifications_itp_point_id ON wp_notifications(itp_point_id);
CREATE INDEX IF NOT EXISTS idx_wp_notifications_status ON wp_notifications(status);
