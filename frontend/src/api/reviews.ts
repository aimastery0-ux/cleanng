import api from "./index";

export interface Review {
  id: number;
  booking: number;
  author: number;
  author_name: string;
  author_avatar: string | null;
  target: number;
  rating: number;
  comment: string;
  created_at: string;
}

export interface BookingReviewStatus {
  review: Review | null;
  can_review: boolean;
}

export const reviewsApi = {
  create: (bookingId: number, rating: number, comment: string): Promise<Review> =>
    api.post("/reviews/", { booking_id: bookingId, rating, comment }).then((r) => r.data),

  forCleaner: (cleanerProfileId: number): Promise<Review[]> =>
    api.get(`/reviews/cleaner/${cleanerProfileId}/`).then((r) => r.data),

  forBooking: (bookingId: number): Promise<BookingReviewStatus> =>
    api.get(`/reviews/booking/${bookingId}/`).then((r) => r.data),
};
