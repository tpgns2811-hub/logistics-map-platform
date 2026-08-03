export type ChangeType = 'create' | 'update';
export type ChangeSource = 'permit' | 'leasing_flyer';
export type ChangeStatus = 'pending' | 'approved' | 'rejected';

export interface PendingChange {
  id: number;
  center_id: string;
  change_type: ChangeType;
  source: ChangeSource;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown>;
  changed_fields: string[] | null;
  status: ChangeStatus;
  batch_id: string | null;
  detected_at: string;
  reviewed_at: string | null;
  reviewer: string | null;
  notes: string | null;
}
