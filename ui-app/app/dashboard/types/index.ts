export interface SchemaField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<string | { value: string; label: string }>;
  defaults?: string[];
  title_placeholder?: string;
  description_placeholder?: string;
  show_when?: { field: string; value: string; operator?: 'equal' | 'not_equal' };
}

export interface SchemaSection {
  id?: string;
  title: string;
  fields?: SchemaField[];
  subsections?: Array<{ title: string; fields: SchemaField[] }>;
  show_for_exhibits?: string[];
  show_for_termination?: string;
  show_for_models?: string[];
  always_show?: boolean;
  show_when?: { field: string; value: string; operator?: 'equal' | 'not_equal' };
}

export interface SchemaStep {
  id: string;
  title: string;
  field?: {
    key: string;
    label: string;
    options: Array<{ value: string; label: string; subtitle?: string } | string>;
  };
  fields?: string[];
  type?: string;
}

export interface Schema {
  id: string;
  name: string;
  description: string;
  icon: string;
  sections?: SchemaSection[] | Record<string, SchemaSection>;
  steps?: SchemaStep[];
}

export interface RecentDoc {
  _id: string;
  doc_type: string;
  name: string;
  icon: string;
  summary: string;
  ai_created: boolean;
  created_at: string;
  updated_at: string;
  data?: Record<string, unknown>;
  source_type?: string;
  is_draft?: boolean;
  validation_status?: 'pending' | 'verified';
  source_email?: string;
  gcs_object_path?: string;
  signed?: boolean;
  client_signed?: boolean;
  released?: boolean;
  client_signed_at?: string;
  client_signed_name?: string;
  client_email?: string;
  party_b_metadata?: {
    email?: string;
    ip?: string;
    user_agent?: string;
    time?: string;
  };
}

export type AppPage = 'landing' | 'analytics' | 'ai' | 'form' | 'pdf' | 'settings' | 'my-documents' | 'workflow-builder';
export type ModalType = 'none' | 'mode' | 'type' | 'preview' | 'new-doc';
export type SettingsTab = 'edit-profile' | 'security';
