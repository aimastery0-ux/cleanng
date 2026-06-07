import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { bookingsApi, Booking, BookingStatus } from "@/api/bookings";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Modal from "@/components/Modal";

const TABS = [
  { label: "New requests", value: "PENDING" },
  { label: "Upcoming", value: "ACCEPTED" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "All", value: "" },
];

function statusVariant(s: BookingStatus) {
  const map: Record<BookingStatus, "orange" | "success" | "error" | "dark" | "grey"> = {
    PENDING: "orange", ACCEPTED: "dark", IN_PROGRESS: "dark",
    COMPLETED: "success", CANCELLED: "error", DISPUTED: "error",
  };
  return map[s] ?? "grey";
}

function CleanerBookingCard({ booking }: { booking: Booking }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cleaner-bookings"] });

  const acceptMutation = useMutation({
    mutationFn: () => bookingsApi.accept(booking.id),
    onSuccess: () => { toast.success("Booking accepted!"); invalidate(); },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error"),
  });

  const declineMutation = useMutation({
    mutationFn: () => bookingsApi.decline(booking.id, declineReason),
    onSuccess: () => { toast.success("Booking declined."); invalidate(); setDeclineOpen(false); },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error"),
  });

  const startMutation = useMutation({
    mutationFn: () => bookingsApi.start(booking.id),
    onSuccess: () => { toast.success("Job started!"); invalidate(); },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error"),
  });

  const completeMutation = useMutation({
    mutationFn: () => bookingsApi.complete(booking.id),
    onSuccess: () => { toast.success("Job marked complete. Awaiting customer confirmation."); invalidate(); },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error"),
  });

  const isPending = acceptMutation.isPending || declineMutation.isPending ||
    startMutation.isPending || completeMutation.isPending;

  return (
    <Card padding="md">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
            <div>
              <p className="font-semibold">{booking.customer_name}</p>
              <p className="text-small text-grey-mid">{booking.service_title}</p>
            </div>
            <Badge variant={statusVariant(booking.status)}>
              {booking.status.replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="text-small text-grey-mid space-y-0.5 mb-3">
            <p>
              📅 {new Date(booking.scheduled_date).toLocaleDateString("en-NG", {
                weekday: "short", day: "numeric", month: "long",
              })} at {booking.scheduled_time.slice(0, 5)}
            </p>
            <p>📍 {booking.address_line1}, {booking.address_area}</p>
            {booking.notes && <p>📝 {booking.notes}</p>}
            <p className="font-semibold text-black mt-1">
              ₦{Number(booking.payout_amount || booking.total_amount).toLocaleString()}
              {booking.payout_amount ? " (your payout)" : ""}
            </p>
          </div>

          {/* Action buttons by status */}
          <div className="flex gap-2 flex-wrap">
            {booking.status === "PENDING" && (
              <>
                <Button size="sm" loading={acceptMutation.isPending} onClick={() => acceptMutation.mutate()}>
                  Accept
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeclineOpen(true)}>
                  Decline
                </Button>
              </>
            )}

            {booking.status === "ACCEPTED" && (
              <Button size="sm" loading={startMutation.isPending} onClick={() => startMutation.mutate()}>
                Mark as started
              </Button>
            )}

            {booking.status === "IN_PROGRESS" && (
              <Button size="sm" loading={completeMutation.isPending} onClick={() => completeMutation.mutate()}>
                Mark as complete
              </Button>
            )}
            {["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(booking.status) && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/chat/${booking.id}`)}>
                Message
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={declineOpen} onClose={() => setDeclineOpen(false)} title="Decline booking">
        <p className="text-small text-grey-mid mb-4">
          Please give a reason so the customer knows what happened.
        </p>
        <textarea
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
          placeholder="e.g. Already booked for that day"
          rows={3}
          className="input w-full resize-none mb-4"
        />
        <div className="flex gap-3">
          <Button size="sm" loading={declineMutation.isPending} onClick={() => declineMutation.mutate()}>
            Confirm decline
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeclineOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

export default function CleanerBookingsPage() {
  const [activeTab, setActiveTab] = useState("PENDING");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["cleaner-bookings", activeTab],
    queryFn: () => bookingsApi.list(activeTab || undefined),
  });

  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-h2 font-extrabold mb-6">Booking requests</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-4 py-1.5 rounded-pill text-small whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === t.value
                ? "bg-orange text-white font-medium"
                : "bg-bg-alt text-grey-mid hover:bg-border"
            }`}
          >
            {t.label}
            {t.value === "PENDING" && pendingCount > 0 && activeTab !== "PENDING" && (
              <span className="bg-error text-white rounded-full px-1.5 text-xs">{pendingCount}</span>
            )}
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
          <h2 className="text-h3 font-bold mb-2">
            {activeTab === "PENDING" ? "No new requests" : "No bookings here"}
          </h2>
          <p className="text-grey-mid">
            {activeTab === "PENDING"
              ? "New booking requests will appear here."
              : "Bookings in this status will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => <CleanerBookingCard key={b.id} booking={b} />)}
        </div>
      )}
    </div>
  );
}
