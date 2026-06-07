import api from "./client";

export interface Payment {
  id: number;
  booking_id: number;
  flw_tx_ref: string;
  amount: string;
  currency: string;
  status: "PENDING" | "HELD_IN_ESCROW" | "RELEASED" | "REFUNDED" | "FAILED";
  method: "CARD" | "TRANSFER" | "USSD" | "";
  paid_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

export interface Payout {
  id: number;
  booking: number;
  amount: string;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";
  flw_transfer_ref: string | null;
  failure_reason: string;
  processed_at: string | null;
}

export interface BookingPaymentStatus {
  booking_id: number;
  payment: Payment | null;
  payout: Payout | null;
}

export interface InitiatePaymentParams {
  tx_ref: string;
  amount: string;
  currency: string;
  customer: { email: string; name: string; phone_number: string };
  public_key: string;
}

export interface BankDetails {
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
}

export const paymentsApi = {
  initiate: (bookingId: number): Promise<InitiatePaymentParams> =>
    api.post("/payments/initiate/", { booking_id: bookingId }).then((r) => r.data),

  verify: (txRef: string): Promise<Payment> =>
    api.get(`/payments/verify/${txRef}/`).then((r) => r.data),

  getForBooking: (bookingId: number): Promise<BookingPaymentStatus> =>
    api.get(`/payments/booking/${bookingId}/`).then((r) => r.data),

  confirmCompletion: (bookingId: number): Promise<{ detail: string }> =>
    api.post(`/payments/booking/${bookingId}/confirm/`).then((r) => r.data),
};

export const bankApi = {
  get: (): Promise<BankDetails> =>
    api.get("/profiles/cleaner/bank-details/").then((r) => r.data),

  update: (data: BankDetails): Promise<BankDetails> =>
    api.put("/profiles/cleaner/bank-details/", data).then((r) => r.data),
};
