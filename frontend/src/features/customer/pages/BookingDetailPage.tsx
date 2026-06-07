import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { bookingsApi, BookingStatus } from "@/api/bookings";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";

function statusVariant(s: BookingStatus) {
  const map: Record<BookingStatus, "orange" | "success" | "error" | "dark" | "grey"> = {
    PENDING: "orange", ACCEPTED: "dark", IN_PROGRESS: "dark",
    COMPLETED: "success", CANCELLED: "error", DISPUTED: "error",
  };
  return map[s] ?? "grey";
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", Number(id)],
    queryFn: () => bookingsApi.get(Number(id)),
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(Number(id)),
    onSuccess: () => { toast.success("Booking cancelled."); qc.invalidateQueries({ queryKey: ["booking", Number(id)] }); },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Cannot cancel."),
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/customer/bookings" className="text-grey-mid hover:text-black text-small">← Bookings</Link>
        <Badge variant={statusVariant(booking.status)}>{booking.status.replace(/_/g, " ")}</Badge>
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

      {/* Actions */}
      {booking.can_cancel && (
        <Button
          variant="outline"
          onClick={() => { if (confirm("Cancel this booking?")) cancelMutation.mutate(); }}
          loading={cancelMutation.isPending}
        >
          Cancel booking
        </Button>
      )}

      {/* Status timeline */}
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
