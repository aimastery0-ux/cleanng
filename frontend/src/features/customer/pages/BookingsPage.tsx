import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { bookingsApi, Booking, BookingStatus } from "@/api/bookings";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Card from "@/components/Card";

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

function statusVariant(s: BookingStatus) {
  const map: Record<BookingStatus, "orange" | "success" | "error" | "dark" | "grey"> = {
    PENDING: "orange",
    ACCEPTED: "dark",
    IN_PROGRESS: "dark",
    COMPLETED: "success",
    CANCELLED: "error",
    DISPUTED: "error",
  };
  return map[s] ?? "grey";
}

function statusLabel(s: BookingStatus) {
  return s.replace(/_/g, " ");
}

function BookingCard({ booking }: { booking: Booking }) {
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(booking.id, cancelReason),
    onSuccess: () => {
      toast.success("Booking cancelled.");
      qc.invalidateQueries({ queryKey: ["customer-bookings"] });
      setCancelOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Cannot cancel."),
  });

  return (
    <Card padding="md">
      <div className="flex items-start gap-4">
        {booking.cleaner_avatar ? (
          <img src={booking.cleaner_avatar} className="w-12 h-12 rounded-full object-cover border border-border shrink-0" alt="" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-bg-alt flex items-center justify-center shrink-0">👤</div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold">{booking.cleaner_name}</p>
              <p className="text-small text-grey-mid">{booking.service_title}</p>
            </div>
            <Badge variant={statusVariant(booking.status)}>{statusLabel(booking.status)}</Badge>
          </div>

          <div className="mt-2 text-small text-grey-mid space-y-0.5">
            <p>
              📅 {new Date(booking.scheduled_date).toLocaleDateString("en-NG", {
                weekday: "short", day: "numeric", month: "long", year: "numeric",
              })} at {booking.scheduled_time.slice(0, 5)}
            </p>
            <p>📍 {booking.address_line1}, {booking.address_area}</p>
            <p className="font-semibold text-black mt-1">
              ₦{Number(booking.total_amount).toLocaleString()}
            </p>
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            <Link to={`/customer/bookings/${booking.id}`}>
              <Button variant="outline" size="sm">View details</Button>
            </Link>
            {booking.can_cancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancelOpen(true)}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel booking">
        <p className="text-small text-grey-mid mb-4">
          Are you sure you want to cancel this booking? This action cannot be undone.
        </p>
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Reason for cancellation (optional)"
          rows={3}
          className="input w-full resize-none mb-4"
        />
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            loading={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            Yes, cancel booking
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCancelOpen(false)}>
            Keep booking
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

export default function CustomerBookingsPage() {
  const [activeTab, setActiveTab] = useState("");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["customer-bookings", activeTab],
    queryFn: () => bookingsApi.list(activeTab || undefined),
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h2 font-extrabold">My bookings</h1>
        <Link to="/search">
          <Button size="sm">+ New booking</Button>
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-4 py-1.5 rounded-pill text-small whitespace-nowrap transition-colors ${
              activeTab === t.value
                ? "bg-orange text-white font-medium"
                : "bg-bg-alt text-grey-mid hover:bg-border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-bg-alt animate-pulse rounded-card" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-h3 font-bold mb-2">No bookings yet</h2>
          <p className="text-grey-mid mb-6">Find a cleaner and book your first session.</p>
          <Link to="/search"><Button>Find a cleaner</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => <BookingCard key={b.id} booking={b} />)}
        </div>
      )}
    </div>
  );
}
