import api from "./client";

export interface PendingCleaner {
  id: number;
  user__email: string;
  user__first_name: string;
  user__last_name: string;
  bio: string;
  years_experience: number;
  id_doc_url: string;
  created_at: string;
}

export interface AdminDispute {
  id: number;
  booking_id: number;
  raised_by: string;
  reason: string;
  status: string;
  created_at: string;
}

export interface AnalyticsData {
  total_bookings: number;
  completed_bookings: number;
  pending_bookings: number;
  active_cleaners: number;
  gmv: string;
  completion_rate: number;
}

export interface PayoutRow {
  status: string;
  count: number;
  total: string;
}

export const adminApi = {
  analytics: (): Promise<AnalyticsData> =>
    api.get("/admin-panel/analytics/").then((r) => r.data),

  pendingCleaners: (): Promise<PendingCleaner[]> =>
    api.get("/admin-panel/cleaners/pending/").then((r) => r.data),

  approveCleaner: (id: number): Promise<void> =>
    api.post(`/admin-panel/cleaners/${id}/approve/`).then(() => undefined),

  rejectCleaner: (id: number, reason: string): Promise<void> =>
    api.post(`/admin-panel/cleaners/${id}/reject/`, { reason }).then(() => undefined),

  disputes: (): Promise<AdminDispute[]> =>
    api.get("/admin-panel/disputes/").then((r) => r.data),

  resolveDispute: (id: number, resolution: string, outcome: string): Promise<void> =>
    api.post(`/admin-panel/disputes/${id}/resolve/`, { resolution, outcome }).then(() => undefined),

  payoutReconciliation: (): Promise<PayoutRow[]> =>
    api.get("/admin-panel/payouts/reconciliation/").then((r) => r.data),
};
