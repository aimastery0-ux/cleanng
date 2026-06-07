import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { adminApi, PendingCleaner, AdminDispute } from "@/api/admin";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";

const TABS = ["Overview", "Cleaners", "Disputes", "Payouts"] as const;
type Tab = typeof TABS[number];

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: adminApi.analytics,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-bg-alt animate-pulse rounded-card" />
        ))}
      </div>
    );
  }

  const stats = [
    { label: "Total bookings", value: data.total_bookings.toLocaleString() },
    { label: "Completed", value: data.completed_bookings.toLocaleString() },
    { label: "Pending", value: data.pending_bookings.toLocaleString() },
    { label: "Active cleaners", value: data.active_cleaners.toLocaleString() },
    { label: "Gross volume (GMV)", value: `₦${Number(data.gmv).toLocaleString()}` },
    { label: "Completion rate", value: `${data.completion_rate}%` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {stats.map((s) => (
        <Card key={s.label} padding="md">
          <p className="text-caption text-grey-mid mb-1">{s.label}</p>
          <p className="text-h2 font-extrabold text-orange">{s.value}</p>
        </Card>
      ))}
    </div>
  );
}

// ── Cleaners ──────────────────────────────────────────────────────────────────

function CleanersTab() {
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<PendingCleaner | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: cleaners = [], isLoading } = useQuery({
    queryKey: ["admin-pending-cleaners"],
    queryFn: adminApi.pendingCleaners,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminApi.approveCleaner(id),
    onSuccess: () => {
      toast.success("Cleaner approved.");
      qc.invalidateQueries({ queryKey: ["admin-pending-cleaners"] });
    },
    onError: () => toast.error("Failed to approve."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminApi.rejectCleaner(id, reason),
    onSuccess: () => {
      toast.success("Cleaner rejected.");
      qc.invalidateQueries({ queryKey: ["admin-pending-cleaners"] });
      setRejectTarget(null);
      setRejectReason("");
    },
    onError: () => toast.error("Failed to reject."),
  });

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-bg-alt animate-pulse rounded-card" />)}</div>;

  if (!cleaners.length) {
    return (
      <div className="py-20 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-h3 font-bold">No pending cleaners</h2>
        <p className="text-grey-mid mt-1">All applications have been reviewed.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {cleaners.map((c) => (
          <Card key={c.id} padding="md">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{c.user__first_name} {c.user__last_name}</p>
                <p className="text-small text-grey-mid">{c.user__email}</p>
                {c.bio && <p className="text-small text-grey-dark mt-1 line-clamp-2">{c.bio}</p>}
                <p className="text-caption text-grey-mid mt-1">{c.years_experience} yrs exp</p>
                {c.id_doc_url && (
                  <a href={c.id_doc_url} target="_blank" rel="noopener noreferrer"
                     className="text-caption text-orange hover:underline mt-1 inline-block">
                    View ID document →
                  </a>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" loading={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(c.id)}>
                  Approve
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRejectTarget(c)}>
                  Reject
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject cleaner">
        <p className="text-small text-grey-mid mb-4">
          This will notify <strong>{rejectTarget?.user__first_name}</strong> that their application was rejected.
        </p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection (optional)..."
          rows={3}
          className="input w-full resize-none mb-4"
        />
        <div className="flex gap-3">
          <Button
            size="sm"
            loading={rejectMutation.isPending}
            onClick={() => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason })}
          >
            Confirm reject
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setRejectTarget(null)}>Cancel</Button>
        </div>
      </Modal>
    </>
  );
}

// ── Disputes ──────────────────────────────────────────────────────────────────

function DisputesTab() {
  const qc = useQueryClient();
  const [target, setTarget] = useState<AdminDispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [outcome, setOutcome] = useState("COMPLETED");

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: adminApi.disputes,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution, outcome }: { id: number; resolution: string; outcome: string }) =>
      adminApi.resolveDispute(id, resolution, outcome),
    onSuccess: () => {
      toast.success("Dispute resolved.");
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
      setTarget(null);
      setResolution("");
    },
    onError: () => toast.error("Failed to resolve."),
  });

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-bg-alt animate-pulse rounded-card" />)}</div>;

  if (!disputes.length) {
    return (
      <div className="py-20 text-center">
        <div className="text-5xl mb-4">🏳️</div>
        <h2 className="text-h3 font-bold">No active disputes</h2>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {disputes.map((d) => (
          <Card key={d.id} padding="md">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-small">Booking #{d.booking_id}</p>
                  <Badge variant={d.status === "OPEN" ? "orange" : "success"}>
                    {d.status}
                  </Badge>
                </div>
                <p className="text-small text-grey-mid">Raised by: {d.raised_by}</p>
                <p className="text-small text-grey-dark mt-1">{d.reason}</p>
                <p className="text-caption text-grey-light mt-1">
                  {new Date(d.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              {d.status === "OPEN" && (
                <Button size="sm" variant="outline" onClick={() => setTarget(d)}>Resolve</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={!!target} onClose={() => setTarget(null)} title="Resolve dispute">
        <div className="space-y-4">
          <div>
            <label className="block text-small font-medium mb-1.5">Resolution note</label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe how the dispute was resolved..."
              rows={3}
              className="input w-full resize-none"
            />
          </div>
          <div>
            <label className="block text-small font-medium mb-1.5">Booking outcome</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="input w-full"
            >
              <option value="COMPLETED">Mark as Completed (release payout)</option>
              <option value="CANCELLED">Mark as Cancelled (trigger refund)</option>
            </select>
          </div>
          <div className="flex gap-3">
            <Button
              size="sm"
              loading={resolveMutation.isPending}
              onClick={() => target && resolveMutation.mutate({ id: target.id, resolution, outcome })}
            >
              Confirm resolution
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setTarget(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Payouts ───────────────────────────────────────────────────────────────────

function PayoutsTab() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: adminApi.payoutReconciliation,
  });

  const statusColor: Record<string, string> = {
    SUCCESS: "text-success",
    FAILED: "text-error",
    PROCESSING: "text-orange",
    PENDING: "text-grey-mid",
  };

  if (isLoading) return <div className="h-32 bg-bg-alt animate-pulse rounded-card" />;

  return (
    <Card padding="md">
      <h2 className="font-semibold mb-4">Payout reconciliation</h2>
      <table className="w-full text-small">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left pb-2 text-grey-mid font-medium">Status</th>
            <th className="text-right pb-2 text-grey-mid font-medium">Count</th>
            <th className="text-right pb-2 text-grey-mid font-medium">Total (₦)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.status}>
              <td className={`py-2.5 font-medium ${statusColor[row.status] ?? ""}`}>{row.status}</td>
              <td className="py-2.5 text-right">{row.count}</td>
              <td className="py-2.5 text-right font-semibold">
                ₦{Number(row.total || 0).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-h2 font-extrabold mb-6">Admin panel</h1>

      <div className="flex gap-1 mb-8 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-pill text-small whitespace-nowrap transition-colors ${
              tab === t
                ? "bg-orange text-white font-medium"
                : "bg-bg-alt text-grey-mid hover:bg-border"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab />}
      {tab === "Cleaners" && <CleanersTab />}
      {tab === "Disputes" && <DisputesTab />}
      {tab === "Payouts" && <PayoutsTab />}
    </div>
  );
}
