import api from "./client";

export interface Notification {
  id: number;
  type: string;
  channel: "SMS" | "EMAIL" | "IN_APP";
  payload: {
    title: string;
    body: string;
    booking_id?: number;
  };
  status: "PENDING" | "SENT" | "FAILED";
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list: (): Promise<Notification[]> =>
    api.get("/notifications/").then((r) => r.data),

  markRead: (id: number): Promise<void> =>
    api.post(`/notifications/${id}/read/`).then(() => undefined),

  markAllRead: (): Promise<void> =>
    api.post("/notifications/read-all/").then(() => undefined),
};
