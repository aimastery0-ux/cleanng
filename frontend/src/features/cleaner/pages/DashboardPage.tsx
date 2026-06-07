import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { profilesApi } from "@/api/profiles";
import { useAuthStore } from "@/store/auth";
import Badge from "@/components/Badge";
import Card from "@/components/Card";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card padding="md">
      <p className="text-caption text-grey-mid uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-extrabold text-black">{value}</p>
      {sub && <p className="text-caption text-grey-mid mt-1">{sub}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: profile } = useQuery({
    queryKey: ["cleaner-profile"],
    queryFn: () => profilesApi.getCleanerProfile(),
  });

  const { data: stats } = useQuery({
    queryKey: ["cleaner-stats"],
    queryFn: () => profilesApi.getStats(),
  });

  const verificationBadge = () => {
    const status = profile?.verification_status;
    if (status === "APPROVED") return <Badge variant="success">Verified</Badge>;
    if (status === "PENDING") return <Badge variant="orange">Under review</Badge>;
    return <Badge variant="grey">Unverified</Badge>;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h2 font-extrabold">
            Welcome back, {user?.first_name || "Cleaner"} 👋
          </h1>
          <div className="mt-1 flex items-center gap-2">
            {verificationBadge()}
            {profile && (
              <span className="text-caption text-grey-mid">
                ⭐ {profile.rating_avg} ({profile.rating_count} reviews)
              </span>
            )}
          </div>
        </div>
        <Link
          to="/cleaner/profile"
          className="btn btn-primary text-sm px-5 py-2 self-start"
        >
          Edit profile
        </Link>
      </div>

      {/* Stats grid */}
      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total bookings"
            value={stats.total_bookings}
            sub={`${stats.completed_bookings} completed`}
          />
          <StatCard
            label="Pending"
            value={stats.pending_bookings}
            sub="needs attention"
          />
          <StatCard
            label="Total earned"
            value={`₦${Number(stats.total_earned).toLocaleString()}`}
          />
          <StatCard
            label="This month"
            value={`₦${Number(stats.this_month_earned).toLocaleString()}`}
            sub={`${stats.this_month_bookings} bookings`}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-bg-alt animate-pulse rounded-card" />
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/cleaner/services" className="card hover:border-orange transition-colors p-5 block">
          <div className="text-2xl mb-2">🧹</div>
          <h3 className="font-semibold">Services</h3>
          <p className="text-small text-grey-mid mt-1">
            {profile?.services?.length ?? 0} active service{profile?.services?.length !== 1 ? "s" : ""}
          </p>
        </Link>
        <Link to="/cleaner/availability" className="card hover:border-orange transition-colors p-5 block">
          <div className="text-2xl mb-2">📅</div>
          <h3 className="font-semibold">Availability</h3>
          <p className="text-small text-grey-mid mt-1">
            {profile?.availability?.length ?? 0} slots set
          </p>
        </Link>
        <Link to="/cleaner/profile" className="card hover:border-orange transition-colors p-5 block">
          <div className="text-2xl mb-2">👤</div>
          <h3 className="font-semibold">Profile</h3>
          <p className="text-small text-grey-mid mt-1">Bio, photos &amp; areas</p>
        </Link>
      </div>

      {/* Recent reviews */}
      {profile?.recent_reviews && profile.recent_reviews.length > 0 && (
        <section>
          <h2 className="text-h3 font-bold mb-4">Recent reviews</h2>
          <div className="space-y-3">
            {profile.recent_reviews.map((r, i) => (
              <Card key={i} padding="md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{r.author_name}</p>
                    <p className="text-small text-grey-mid mt-1">{r.comment}</p>
                  </div>
                  <span className="text-orange font-bold">{"★".repeat(r.rating)}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
