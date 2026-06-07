import client from "./client";

export type BookingStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export interface StatusLog {
  id: number;
  from_status: string;
  to_status: string;
  actor_name: string;
  note: string;
  created_at: string;
}

export interface Booking {
  id: number;
  customer: number;
  customer_name: string;
  customer_avatar: string;
  cleaner: number;
  cleaner_name: string;
  cleaner_avatar: string;
  cleaner_profile_id: number;
  service: number;
  service_title: string;
  service_type: string;
  service_pricing_unit: string;
  address: number;
  address_label: string;
  address_line1: string;
  address_area: string;
  scheduled_date: string;
  scheduled_time: string;
  status: BookingStatus;
  total_amount: string;
  commission_amount: string;
  payout_amount: string;
  notes: string;
  cancellation_reason: string;
  can_cancel: boolean;
  can_dispute: boolean;
  status_logs: StatusLog[];
  created_at: string;
  updated_at: string;
}

export interface CreateBookingPayload {
  cleaner_id: number;
  service_id: number;
  address_id: number;
  scheduled_date: string;
  scheduled_time: string;
  notes?: string;
}

const BASE = "/api/v1/bookings";

export const bookingsApi = {
  list: (status?: string) =>
    client.get<Booking[]>(BASE + "/", { params: status ? { status } : {} }).then((r) => r.data),

  get: (id: number) =>
    client.get<Booking>(`${BASE}/${id}/`).then((r) => r.data),

  create: (payload: CreateBookingPayload) =>
    client.post<Booking>(BASE + "/", payload).then((r) => r.data),

  accept: (id: number) =>
    client.post<Booking>(`${BASE}/${id}/accept/`).then((r) => r.data),

  decline: (id: number, reason?: string) =>
    client.post<Booking>(`${BASE}/${id}/decline/`, { reason }).then((r) => r.data),

  start: (id: number) =>
    client.post<Booking>(`${BASE}/${id}/start/`).then((r) => r.data),

  complete: (id: number) =>
    client.post<Booking>(`${BASE}/${id}/complete/`).then((r) => r.data),

  cancel: (id: number, reason?: string) =>
    client.post<Booking>(`${BASE}/${id}/cancel/`, { reason }).then((r) => r.data),

  dispute: (id: number, data: { reason: string; description: string }) =>
    client.post(`${BASE}/${id}/dispute/`, data).then((r) => r.data),
};
