export interface User {
  id: number;
  full_name: string;
  email: string;
  role_id: number;
  role_name?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

export interface NCR {
  id: number;
  itp_point_id: number;
  title?: string;
  description: string;
  status: 'Open' | 'Resolved' | 'Verified' | 'Closed';
  created_at: string;
  resolved_at?: string;
  created_by?: number;
  created_by_name?: string;
  created_by_role?: string;
}

export interface MediaFile {
  id: number;
  itp_point_id: number;
  file_path: string;
  file_type?: string;
  url?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
}

export type PointType = 'HP' | 'WP' | 'RP' | 'IP' | 'SP';
export type PointStatus = 'Open' | 'Approved' | 'Rejected' | 'Closed';
export type ITPStatus = 'Draft' | 'Pending Review' | 'Open' | 'Closed';

export interface ITPPoint {
  id: number;
  instance_id: number;
  sequence: number;
  description: string;
  type: PointType;
  status: PointStatus;
  acceptance_criteria?: string;
  reference_documents?: string;
  inspection_method?: string;
  frequency?: string;
  responsible_party?: string;
  section?: string;
  verifying_records?: string;
  approver_role_id?: number;
  signed_off_by?: number;
  signed_off_by_name?: string;
  signed_off_by_email?: string;
  signed_off_by_role?: string;
  signed_off_at?: string;
  comments?: string;
  is_external_sign_off?: boolean;
  external_signer_email?: string;
  pending_external_email?: string;
  pending_external_role?: string;
  pending_external_expires?: string;
  ncrs: NCR[];
  media: MediaFile[];
}

export interface ITPInstance {
  id: number;
  template_id: number;
  project_id: number;
  name: string;
  status: ITPStatus;
  lot_number?: string;
  panel_no?: string;
  revision?: string;
  drawing_ref?: string;
  created_by?: number;
  created_at?: string;
  closure_notes?: string;
  points: ITPPoint[];
}

export interface ITPTemplatePoint {
  id?: number;
  template_id?: number;
  sequence: number;
  description: string;
  type: string;
  acceptance_criteria?: string;
  reference_documents?: string;
  inspection_method?: string;
  frequency?: string;
  responsible_party?: string;
  section?: string;
  verifying_records?: string;
  approver_role_id?: number;
}

export interface ITPTemplate {
  id: number;
  project_id?: number;
  name: string;
  description?: string;
  trade_category?: string;
  is_public?: boolean;
  version?: string;
  clone_count?: number;
  created_by_org?: string;
  created_at?: string;
  points?: ITPTemplatePoint[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
