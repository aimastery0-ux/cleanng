import { useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { bookingsApi, BookingStatus } from "@/api/bookings";
import { paymentsApi } from "@/api/payments";
import { reviewsApi } from "@/api/reviews";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import StarPicker, { StarDisplay } from "@/components/StarPicker";

function statusVariant(s: BookingStatus) {
  const map: Record<BookingStatus, "orange" | "success" | "error" | "dark" | "grey"> = {
    PENDING: "orange", ACCEPTED: "dark", IN_PROGRESS: "dark",
    COMPLETED: "success", CANCELLED: "error", DISPUTED: "error",
  };
  return map[s] ?? "grey";
}

function paymentStatusLabel(s: string) {
  const labels: Record<string, string> = {
    PENDING: "Payment pending",
    HELD_IN_ESCROW: "Payment held in escrow",
    RELEASED: "Payment released",
    REFUNDED: "Refunded",
    FAILED: "Payment failed",
  };
  return labels[s] ?? s;
}

function paymentStatusVariant(s: string): "orange" | "success" | "error" | "dark" | "grey" {
  if (s === "HELD_IN_ESCROW") return "orange";
  if (s === "RELEASED") return "success";
  if (s === "REFUNDED" || s === "FAILED") return "error";
  return "grey";
}

function ReviewSection({ bookingId }: { bookingId: number }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data: reviewStatus } = useQuery({
    queryKey: ["booking-review", bookingId],
    queryFn: () => reviewsApi.forBooking(bookingId),
  });

  const submitMutation = useMutation({
    mutationFn: () => reviewsApi.create(bookingId, rating, comment),
    onSuccess: () => {
      toast.success("Review submitted. Thank you!");
      qc.invalidateQueries({ queryKey: ["booking-review", bookingId] });
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.booking_id?.[0] ?? "Could not submit review."),
  });

  if (!reviewStatus) return null;

  if (reviewStatus.review) {
    return (
      <Card padding="md">
        <h3 className="font-semibold mb-3">Your review</h3>
        <StarDisplay rating={reviewStatus.review.rating} />
        {reviewStatus.review.comment && (
          <p className="text-small text-grey-dark mt-2">{reviewStatus.review.comment}</p>
        )}
        <p className="text-caption text-grey-light mt-1">
          {new Date(reviewStatus.review.created_at).toLocaleDateString("en-NG", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </Card>
    );
  }

  if (!reviewStatus.can_review) return null;

  return (
    <Card padding="md">
      <h3 className="font-semibold mb-1">Leave a review</h3>
      <p className="text-small text-grey-mid mb-4">How was the service?</p>

      <div className="space-y-4">
        <div>
          <label className="block text-small font-medium mb-2">Rating</label>
          <StarPicker value={rating} onChange={setRating} size="lg" />
        </div>

        <div>
          <label className="block text-small font-medium mb-1.5">Comment (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Share your experience..."
            className="input w-full resize-none"
            maxLength={1000}
          />
        </div>

        <Button
          loading={submitMutation.isPending}
          disabled={rating === 0}
          onClick={() => submitMutation.mutate()}
        >
          Submit review
        </Button>
      </div>
    </Card>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const bookingId = Number(id);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => bookingsApi.get(bookingId),
  });

  const { data: paymentStatus } = useQuery({
    queryKey: ["booking-payment", bookingId],
    queryFn: () => paymentsApi.getForBooking(bookingId),
    enabled: !!bookingId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(bookingId),
    onSuccess: () => {
      toast.success("Booking cancelled.");
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Cannot cancel."),
  });

  const confirmMutation = useMutation({
    mutationFn: () => paymentsApi.confirmCompletion(bookingId),
    onSuccess: () => {
      toast.success("Job confirmed! Payout initiated for the cleaner.");
      qc.invalidateQueries({ queryKey: ["booking-payment", bookingId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Could not confirm."),
  });

  if (isLoading || !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-bg-alt rounded-card" />)}
      </div>
    );
  }

  const total = Number(booking.total_amount);
  const commission = Number(booking.commission_amount);
  const payment = paymentStatus?.payment;

  const showPayNow =
    booking.status === "ACCEPTED" &&
    (!payment || payment.status === "PENDING" || payment.status === "FAILED");

  const showConfirmCompletion =
    booking.status === "COMPLETED" &&
    payment?.status === "HELD_IN_ESCROW";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/customer/bookings" className="text-grey-mid hover:text-black text-small">← Bookings</Link>
        <Badge variant={statusVariant(booking.status)}>{booking.status.replace(/_/g, " ")}</Badge>
        {payment && (
          <Badge variant={paymentStatusVariant(payment.status)}>
            {paymentStatusLabel(payment.status)}
          </Badge>
        )}
      </div>

      <Card padding="lg" className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          {booking.cleaner_avatar ? (
            <img src={booking.cleaner_avatar} className="w-12 h-12 rounded-full object-cover border border-border" alt="" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-bg-alt flex items-center justify-center">👤</div>
          )}
          <div>
            <p className="font-bold">{booking.cleaner_name}</p>
            <Link to={`/cleaners/${booking.cleaner_profile_id}`} className="text-small text-orange hover:underline">
              View profile
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-small">
          <div><p className="text-grey-mid">Service</p><p className="font-medium">{booking.service_title}</p></div>
          <div>
            <p className="text-grey-mid">Date</p>
            <p className="font-medium">{new Date(booking.scheduled_date).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "long" })}</p>
          </div>
          <div><p className="text-grey-mid">Time</p><p className="font-medium">{booking.scheduled_time.slice(0, 5)}</p></div>
          <div><p className="text-grey-mid">Address</p><p className="font-medium">{booking.address_line1}, {booking.address_area}</p></div>
        </div>

        {booking.notes && (
          <div className="pt-3 border-t border-border">
            <p className="text-small text-grey-mid mb-1">Notes</p>
            <p className="text-small">{booking.notes}</p>
          </div>
        )}

        <div className="pt-3 border-t border-border space-y-1.5 text-small">
          <div className="flex justify-between"><span className="text-grey-mid">Service fee</span><span>₦{total.toLocaleString()}</span></div>
          {commission > 0 && (
            <div className="flex justify-between"><span className="text-grey-mid">Platform fee</span><span>₦{commission.toLocaleString()}</span></div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
            <span>Total</span><span className="text-orange">₦{total.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {showPayNow && (
        <div className="bg-orange/5 border border-orange/30 rounded-card p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Payment required</p>
            <p className="text-small text-grey-mid">Pay now to secure your booking. Funds are held in escrow.</p>
          </div>
          <Button onClick={() => navigate(`/pay/${bookingId}`)}>
            Pay ₦{total.toLocaleString()}
          </Button>
        </div>
      )}

      {showConfirmCompletion && (
        <div className="bg-green-50 border border-green-200 rounded-card p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Did the cleaner finish the job?</p>
            <p className="text-small text-grey-mid">Confirming will release the payment to the cleaner.</p>
          </div>
          <Button
            onClick={() => { if (confirm("Confirm the job is complete and release payment?")) confirmMutation.mutate(); }}
            loading={confirmMutation.isPending}
          >
            Confirm & release
          </Button>
        </div>
      )}

      {/* Message cleaner */}
      {["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(booking.status) && (
        <Button variant="outline" onClick={() => navigate(`/chat/${bookingId}`)}>
          Message cleaner
        </Button>
      )}

      {booking.can_cancel && (
        <Button
          variant="outline"
          onClick={() => { if (confirm("Cancel this booking?")) cancelMutation.mutate(); }}
          loading={cancelMutation.isPending}
        >
          Cancel booking
        </Button>
      )}

      {/* Review form / submitted review */}
      <ReviewSection bookingId={bookingId} />

      {booking.status_logs.length > 0 && (
        <Card padding="md">
          <h3 className="font-semibold mb-3">Status history</h3>
          <div className="space-y-3">
            {booking.status_logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-small">
                <div className="w-2 h-2 rounded-full bg-orange mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    {log.from_status ? `${log.from_status} → ${log.to_status}` : log.to_status}
                  </p>
                  {log.note && <p className="text-grey-mid">{log.note}</p>}
                  <p className="text-caption text-grey-light">
                    {new Date(log.created_at).toLocaleString("en-NG")}
                    {log.actor_name && ` · ${log.actor_name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
