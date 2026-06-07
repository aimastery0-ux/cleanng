import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { profilesApi, CleanerProfile } from "@/api/profiles";
import { reviewsApi } from "@/api/reviews";
import { useAuthStore } from "@/store/auth";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { StarDisplay } from "@/components/StarPicker";

const PAGE_SIZE = 5;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SERVICE_TYPE_LABELS: Record<string, string> = {
  HOME_CLEANING: "Home cleaning",
  DEEP_CLEANING: "Deep cleaning",
  OFFICE_CLEANING: "Office cleaning",
  MOVE_IN_OUT: "Move-in/move-out",
  POST_CONSTRUCTION: "Post-construction",
  CARPET_CLEANING: "Carpet cleaning",
  WINDOW_CLEANING: "Window cleaning",
  LAUNDRY: "Laundry",
};

const PRICING_UNIT_LABELS: Record<string, string> = {
  PER_HOUR: "/hr",
  PER_JOB: "/job",
  PER_ROOM: "/room",
  PER_SQFT: "/sq.ft",
};


function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 animate-pulse">
      <div className="flex gap-6">
        <div className="w-24 h-24 rounded-full bg-bg-alt" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-bg-alt rounded w-40" />
          <div className="h-4 bg-bg-alt rounded w-60" />
          <div className="h-4 bg-bg-alt rounded w-32" />
        </div>
      </div>
      <div className="h-32 bg-bg-alt rounded-card" />
      <div className="h-32 bg-bg-alt rounded-card" />
    </div>
  );
}

export default function CleanerPublicPage() {
  const { id } = useParams<{ id: string }>();
  const cleanerId = parseInt(id ?? "0", 10);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [reviewsPage, setReviewsPage] = useState(1);

  const handleBookNow = () => {
    if (user?.role === "CLEANER") {
      toast.error("Cleaners cannot make bookings. Switch to a customer account.");
      return;
    }
    navigate(`/book/${cleanerId}`);
  };

  const { data: cleaner, isLoading, isError } = useQuery({
    queryKey: ["public-cleaner", cleanerId],
    queryFn: () => profilesApi.getPublicCleanerProfile(cleanerId),
    enabled: !!cleanerId,
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ["cleaner-reviews", cleanerId],
    queryFn: () => reviewsApi.forCleaner(cleanerId),
    enabled: !!cleanerId,
  });

  const visibleReviews = allReviews.slice(0, reviewsPage * PAGE_SIZE);
  const hasMoreReviews = visibleReviews.length < allReviews.length;

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !cleaner) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h1 className="text-h2 font-bold mb-2">Profile not found</h1>
        <p className="text-grey-mid mb-6">This cleaner's profile isn't available.</p>
        <Link to="/search">
          <Button>Browse cleaners</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {cleaner.avatar_url ? (
          <img
            src={cleaner.avatar_url}
            alt={cleaner.full_name}
            className="w-24 h-24 rounded-full object-cover border-2 border-border shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-bg-alt flex items-center justify-center text-3xl shrink-0">
            👤
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-h2 font-extrabold">{cleaner.full_name}</h1>
            {cleaner.is_verified && (
              <Badge variant="success">Verified</Badge>
            )}
            {cleaner.is_featured && (
              <Badge variant="orange">Featured</Badge>
            )}
          </div>

          {cleaner.rating_count > 0 && (
            <div className="mb-2">
              <StarDisplay rating={Number(cleaner.rating_avg)} count={cleaner.rating_count} />
            </div>
          )}

          {cleaner.service_areas?.length > 0 && (
            <p className="text-small text-grey-mid mb-2">
              📍 {cleaner.service_areas.join(" · ")}
            </p>
          )}

          <p className="text-small text-grey-mid">
            {cleaner.years_experience} year{cleaner.years_experience !== 1 ? "s" : ""} of experience
          </p>
        </div>

        <div className="shrink-0">
          <Button size="lg" onClick={handleBookNow}>
            Book {cleaner.first_name}
          </Button>
        </div>
      </div>

      {/* About */}
      {cleaner.bio && (
        <Card padding="lg">
          <h2 className="text-h3 font-bold mb-3">About</h2>
          <p className="text-body text-grey-dark leading-relaxed">{cleaner.bio}</p>
        </Card>
      )}

      {/* Services */}
      {cleaner.services?.length > 0 && (
        <section>
          <h2 className="text-h3 font-bold mb-4">Services offered</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cleaner.services.map((s) => (
              <Card key={s.id} padding="md">
                <p className="text-caption text-grey-mid uppercase tracking-wider mb-1">
                  {SERVICE_TYPE_LABELS[s.type] ?? s.type}
                </p>
                <p className="font-semibold">{s.title}</p>
                <p className="text-h3 font-extrabold text-orange mt-1">
                  ₦{Number(s.price).toLocaleString()}
                  <span className="text-small font-normal text-grey-mid">
                    {PRICING_UNIT_LABELS[s.pricing_unit] ?? s.pricing_unit}
                  </span>
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Availability */}
      {cleaner.availability?.length > 0 && (
        <section>
          <h2 className="text-h3 font-bold mb-4">Availability</h2>
          <div className="flex flex-wrap gap-2">
            {cleaner.availability.map((slot) => (
              <div
                key={slot.id}
                className="px-4 py-2 bg-bg-alt rounded-pill text-small"
              >
                <span className="font-semibold">{DAY_NAMES[slot.day_of_week]}</span>
                <span className="text-grey-mid ml-2">
                  {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio */}
      {cleaner.portfolio_images?.length > 0 && (
        <section>
          <h2 className="text-h3 font-bold mb-4">Portfolio</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cleaner.portfolio_images.map((url, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-input">
                <img
                  src={url}
                  alt={`Work sample ${i + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      {allReviews.length > 0 && (
        <section>
          <h2 className="text-h3 font-bold mb-4">
            Reviews
            <span className="text-small font-normal text-grey-mid ml-2">({allReviews.length})</span>
          </h2>
          <div className="space-y-3">
            {visibleReviews.map((r) => (
              <Card key={r.id} padding="md">
                <div className="flex items-start gap-3">
                  {r.author_avatar ? (
                    <img src={r.author_avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 border border-border" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-bg-alt flex items-center justify-center text-sm shrink-0">👤</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-small">{r.author_name}</p>
                      <StarDisplay rating={r.rating} />
                    </div>
                    {r.comment && <p className="text-small text-grey-dark mt-1">{r.comment}</p>}
                    <p className="text-caption text-grey-light mt-1">
                      {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {hasMoreReviews && (
            <button
              className="mt-4 w-full py-2 text-small text-orange border border-orange/30 rounded-pill hover:bg-orange/5 transition-colors"
              onClick={() => setReviewsPage((p) => p + 1)}
            >
              Show more reviews
            </button>
          )}
        </section>
      )}

      {/* Floating CTA */}
      <div className="sticky bottom-6 flex justify-center">
        <div className="bg-white border border-border rounded-pill px-6 py-3 shadow-lg flex items-center gap-4">
          <div>
            <p className="font-semibold">{cleaner.full_name}</p>
            <p className="text-caption text-grey-mid">
              From ₦{Number(cleaner.base_hourly_rate).toLocaleString()}/hr
            </p>
          </div>
          <Button size="md" onClick={handleBookNow}>Book now</Button>
        </div>
      </div>
    </div>
  );
}
