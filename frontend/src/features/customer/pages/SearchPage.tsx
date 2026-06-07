import { useState, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { searchApi, SearchResult, SearchParams } from "@/api/search";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import { formatNaira } from "@/lib/utils";
import { SlidersHorizontal, MapPin, List, X, Star } from "lucide-react";

const LAGOS_AREAS = [
  "Ikeja", "Victoria Island", "Lekki", "Ajah", "Yaba", "Surulere",
  "Ikoyi", "Gbagada", "Maryland", "Ojodu", "Berger", "Agege",
  "Oshodi", "Isolo", "Festac", "Badagry", "Epe", "Ikorodu",
  "Kosofe", "Shomolu", "Mushin", "Alimosho",
];

const SERVICE_TYPES = [
  { value: "", label: "All services" },
  { value: "HOME_CLEANING", label: "Home cleaning" },
  { value: "DEEP_CLEANING", label: "Deep cleaning" },
  { value: "OFFICE_CLEANING", label: "Office cleaning" },
  { value: "MOVE_IN_OUT", label: "Move-in/move-out" },
  { value: "POST_CONSTRUCTION", label: "Post-construction" },
  { value: "CARPET_CLEANING", label: "Carpet cleaning" },
  { value: "WINDOW_CLEANING", label: "Window cleaning" },
  { value: "LAUNDRY", label: "Laundry" },
];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured first" },
  { value: "rating", label: "Highest rated" },
  { value: "price_asc", label: "Lowest price" },
  { value: "price_desc", label: "Highest price" },
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };
const MAPS_LIBRARIES: ("places")[] = ["places"];

function StarRow({ avg, count }: { avg: string; count: number }) {
  const n = Math.round(Number(avg));
  return (
    <span className="flex items-center gap-1 text-small text-grey-mid">
      <span className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i < n ? "fill-orange text-orange" : "fill-border text-border"}`}
          />
        ))}
      </span>
      {Number(avg).toFixed(1)} ({count})
    </span>
  );
}

function CleanerCard({ cleaner }: { cleaner: SearchResult }) {
  return (
    <Link
      to={`/cleaners/${cleaner.id}`}
      className="card hover:border-orange hover:shadow-sm transition-all flex gap-4 p-4 block"
    >
      {/* Avatar */}
      <div className="shrink-0">
        {cleaner.avatar_url ? (
          <img
            src={cleaner.avatar_url}
            alt={cleaner.full_name}
            className="w-16 h-16 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-bg-alt flex items-center justify-center text-2xl">
            👤
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-black truncate">{cleaner.full_name}</h3>
              {cleaner.is_verified && (
                <Badge variant="success" className="text-xs shrink-0">Verified</Badge>
              )}
              {cleaner.is_featured && (
                <Badge variant="orange" className="text-xs shrink-0">Featured</Badge>
              )}
            </div>
            <StarRow avg={cleaner.rating_avg} count={cleaner.rating_count} />
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-orange">
              ₦{Number(cleaner.base_hourly_rate).toLocaleString()}
            </p>
            <p className="text-caption text-grey-mid">/hr</p>
          </div>
        </div>

        {cleaner.bio && (
          <p className="text-small text-grey-mid mt-1.5 line-clamp-2">{cleaner.bio}</p>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
          {cleaner.service_areas.slice(0, 3).map((area) => (
            <span key={area} className="text-caption bg-bg-alt px-2 py-0.5 rounded-pill">
              📍 {area}
            </span>
          ))}
          {cleaner.service_areas.length > 3 && (
            <span className="text-caption text-grey-mid">+{cleaner.service_areas.length - 3}</span>
          )}
        </div>

        {cleaner.distance_km !== null && (
          <p className="text-caption text-grey-mid mt-1">
            <MapPin className="inline h-3 w-3 mr-0.5" />
            {cleaner.distance_km} km away
          </p>
        )}
      </div>
    </Link>
  );
}

function MapView({
  results,
  onSelect,
  selected,
}: {
  results: SearchResult[];
  onSelect: (id: number | null) => void;
  selected: number | null;
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: MAPS_LIBRARIES });
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (!isLoaded) {
    return (
      <div className="h-full bg-bg-alt flex items-center justify-center text-grey-mid">
        Loading map…
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="h-full bg-bg-alt flex items-center justify-center text-grey-mid text-center p-8">
        <div>
          <div className="text-3xl mb-2">🗺️</div>
          <p className="text-small">Add VITE_GOOGLE_MAPS_API_KEY to enable the map view.</p>
        </div>
      </div>
    );
  }

  const selectedCleaner = results.find((r) => r.id === selected);

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full rounded-card"
      center={LAGOS_CENTER}
      zoom={12}
      onLoad={onMapLoad}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
    >
      {results.map((cleaner) => (
        <Marker
          key={cleaner.id}
          position={LAGOS_CENTER}
          label={{ text: `₦${Math.round(Number(cleaner.base_hourly_rate) / 1000)}k`, color: "#fff" }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 18,
            fillColor: cleaner.is_featured ? "#F5841F" : "#1D1D1D",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          }}
          onClick={() => onSelect(cleaner.id)}
        />
      ))}

      {selected && selectedCleaner && (
        <InfoWindow
          position={LAGOS_CENTER}
          onCloseClick={() => onSelect(null)}
        >
          <Link to={`/cleaners/${selectedCleaner.id}`} className="block max-w-xs">
            <p className="font-semibold text-black">{selectedCleaner.full_name}</p>
            <StarRow avg={selectedCleaner.rating_avg} count={selectedCleaner.rating_count} />
            <p className="text-orange font-bold mt-1">
              ₦{Number(selectedCleaner.base_hourly_rate).toLocaleString()}/hr
            </p>
            <p className="text-caption text-orange mt-1 hover:underline">View profile →</p>
          </Link>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"list" | "map">("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);

  // Local filter state driven by URL params
  const getParam = (key: string, fallback = "") => searchParams.get(key) ?? fallback;

  const area = getParam("area");
  const type = getParam("type");
  const sort = (getParam("sort", "featured")) as SearchParams["sort"];
  const minPrice = getParam("min_price");
  const maxPrice = getParam("max_price");
  const minRating = getParam("min_rating");
  const availableDay = getParam("available_day");
  const page = parseInt(getParam("page", "1"), 10);

  const setParam = (updates: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    });
    next.set("page", "1"); // reset page on filter change
    setSearchParams(next, { replace: true });
  };

  const params: SearchParams = {
    area: area || undefined,
    type: type || undefined,
    sort,
    min_price: minPrice || undefined,
    max_price: maxPrice || undefined,
    min_rating: minRating || undefined,
    available_day: availableDay !== "" ? availableDay : undefined,
    page,
    page_size: 20,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", params],
    queryFn: () => searchApi.searchCleaners(params),
    keepPreviousData: true,
  });

  const results = data?.results ?? [];
  const totalPages = data?.total_pages ?? 1;

  const clearFilters = () => {
    setSearchParams({ sort: "featured" });
  };

  const hasFilters = !!(area || type || minPrice || maxPrice || minRating || availableDay);

  return (
    <div className="min-h-screen bg-white">
      {/* Top search bar */}
      <div className="border-b border-border bg-white sticky top-0 z-20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          {/* Area autocomplete */}
          <div className="relative flex-1 min-w-48">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-mid" />
            <input
              type="text"
              placeholder="Area in Lagos…"
              value={area}
              onChange={(e) => setParam({ area: e.target.value })}
              className="input pl-9 w-full text-small"
              list="area-suggestions"
            />
            <datalist id="area-suggestions">
              {LAGOS_AREAS.filter((a) =>
                !area || a.toLowerCase().includes(area.toLowerCase())
              ).map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          {/* Service type */}
          <select
            value={type}
            onChange={(e) => setParam({ type: e.target.value })}
            className="input text-small min-w-40"
          >
            {SERVICE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setParam({ sort: e.target.value })}
            className="input text-small min-w-36"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`btn btn-outline text-small px-3 py-2 flex items-center gap-1.5 ${hasFilters ? "border-orange text-orange" : ""}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="bg-orange text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">!</span>
            )}
          </button>

          {/* View toggle */}
          <div className="flex rounded-pill border border-border overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2 text-small flex items-center gap-1 ${view === "list" ? "bg-black text-white" : "text-grey-mid hover:bg-bg-alt"}`}
            >
              <List className="h-4 w-4" /> List
            </button>
            <button
              onClick={() => setView("map")}
              className={`px-3 py-2 text-small flex items-center gap-1 ${view === "map" ? "bg-black text-white" : "text-grey-mid hover:bg-bg-alt"}`}
            >
              <MapPin className="h-4 w-4" /> Map
            </button>
          </div>
        </div>

        {/* Expanded filters row */}
        {filtersOpen && (
          <div className="max-w-7xl mx-auto mt-3 pb-1 flex flex-wrap items-end gap-4 border-t border-border pt-3">
            {/* Price range */}
            <div>
              <label className="block text-caption text-grey-mid mb-1">Price range (₦/hr)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setParam({ min_price: e.target.value })}
                  className="input text-small w-24 py-1.5"
                />
                <span className="text-grey-mid">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setParam({ max_price: e.target.value })}
                  className="input text-small w-24 py-1.5"
                />
              </div>
            </div>

            {/* Min rating */}
            <div>
              <label className="block text-caption text-grey-mid mb-1">Min rating</label>
              <select
                value={minRating}
                onChange={(e) => setParam({ min_rating: e.target.value })}
                className="input text-small py-1.5"
              >
                <option value="">Any</option>
                <option value="3">3+ stars</option>
                <option value="4">4+ stars</option>
                <option value="4.5">4.5+ stars</option>
              </select>
            </div>

            {/* Available day */}
            <div>
              <label className="block text-caption text-grey-mid mb-1">Available on</label>
              <select
                value={availableDay}
                onChange={(e) => setParam({ available_day: e.target.value })}
                className="input text-small py-1.5"
              >
                <option value="">Any day</option>
                {DAY_NAMES.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-small text-error hover:underline"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-small text-grey-mid">
            {isLoading ? "Searching…" : (
              <>
                <span className="font-semibold text-black">{data?.count ?? 0}</span> cleaner{(data?.count ?? 0) !== 1 ? "s" : ""} found
                {area && <> near <span className="font-medium text-black">{area}</span></>}
              </>
            )}
          </p>
          {isFetching && !isLoading && (
            <div className="h-4 w-4 border-2 border-orange border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {view === "list" ? (
          <>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-28 bg-bg-alt animate-pulse rounded-card" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-h3 font-bold mb-2">No cleaners found</h2>
                <p className="text-grey-mid mb-4">
                  Try a different area, service type, or remove some filters.
                </p>
                {hasFilters && (
                  <button onClick={clearFilters} className="btn btn-outline text-sm">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((c) => (
                  <CleanerCard key={c.id} cleaner={c} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setParam({ page: page - 1 })}
                >
                  ← Prev
                </Button>
                <span className="text-small text-grey-mid px-3">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setParam({ page: page + 1 })}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex gap-4 h-[calc(100vh-200px)]">
            {/* Map */}
            <div className="flex-1 rounded-card overflow-hidden border border-border">
              <MapView
                results={results}
                onSelect={setSelectedMarker}
                selected={selectedMarker}
              />
            </div>

            {/* Sidebar list */}
            <div className="w-80 overflow-y-auto space-y-3 shrink-0">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-bg-alt animate-pulse rounded-card" />
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-8 text-grey-mid text-small">
                  No cleaners match your filters.
                </div>
              ) : (
                results.map((c) => <CleanerCard key={c.id} cleaner={c} />)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
