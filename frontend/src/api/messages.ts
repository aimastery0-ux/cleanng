import api from "./client";

export interface Message {
  id: number;
  booking: number;
  sender: number;
  sender_name: string;
  sender_avatar: string | null;
  is_mine: boolean;
  body: string;
  sent_at: string;
  read_at: string | null;
}

export const messagesApi = {
  history: (bookingId: number): Promise<Message[]> =>
    api.get(`/messages/booking/${bookingId}/`).then((r) => r.data),
};

const WS_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1")
  .replace(/^http/, "ws")
  .replace("/api/v1", "");

export function createChatSocket(bookingId: number, token: string): WebSocket {
  return new WebSocket(`${WS_BASE}/ws/bookings/${bookingId}/chat/?token=${token}`);
}
