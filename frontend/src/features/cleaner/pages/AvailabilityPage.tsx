import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { profilesApi } from "@/api/profiles";
import Button from "@/components/Button";
import Card from "@/components/Card";

const DAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

const DEFAULT_START = "08:00";
const DEFAULT_END = "18:00";

interface DaySlot {
  enabled: boolean;
  start_time: string;
  end_time: string;
}

type WeekGrid = Record<number, DaySlot>;

function buildGrid(slots: { day_of_week: number; start_time: string; end_time: string }[]): WeekGrid {
  const grid: WeekGrid = {};
  DAYS.forEach(({ value }) => {
    const existing = slots.find((s) => s.day_of_week === value);
    grid[value] = existing
      ? { enabled: true, start_time: existing.start_time, end_time: existing.end_time }
      : { enabled: false, start_time: DEFAULT_START, end_time: DEFAULT_END };
  });
  return grid;
}

export default function AvailabilityPage() {
  const qc = useQueryClient();
  const [grid, setGrid] = useState<WeekGrid | null>(null);

  const { isLoading } = useQuery({
    queryKey: ["availability"],
    queryFn: () => profilesApi.getAvailability(),
    onSuccess: (data) => {
      if (!grid) setGrid(buildGrid(data));
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!grid) return Promise.resolve([]);
      const slots = DAYS.filter((d) => grid[d.value].enabled).map((d) => ({
        day_of_week: d.value,
        start_time: grid[d.value].start_time,
        end_time: grid[d.value].end_time,
      }));
      return profilesApi.bulkSetAvailability(slots);
    },
    onSuccess: () => {
      toast.success("Availability saved.");
      qc.invalidateQueries({ queryKey: ["availability"] });
      qc.invalidateQueries({ queryKey: ["cleaner-profile"] });
    },
    onError: () => toast.error("Failed to save availability."),
  });

  const toggle = (day: number) => {
    if (!grid) return;
    setGrid({ ...grid, [day]: { ...grid[day], enabled: !grid[day].enabled } });
  };

  const setTime = (day: number, field: "start_time" | "end_time", value: string) => {
    if (!grid) return;
    setGrid({ ...grid, [day]: { ...grid[day], [field]: value } });
  };

  if (isLoading || !grid) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-16 bg-bg-alt animate-pulse rounded-card" />
        ))}
      </div>
    );
  }

  const enabledCount = DAYS.filter((d) => grid[d.value].enabled).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-extrabold">Availability</h1>
          <p className="text-small text-grey-mid mt-1">
            {enabledCount} day{enabledCount !== 1 ? "s" : ""} available per week
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={enabledCount === 0}
        >
          Save schedule
        </Button>
      </div>

      <div className="space-y-3">
        {DAYS.map(({ value, label }) => {
          const slot = grid[value];
          return (
            <Card
              key={value}
              padding="md"
              variant={slot.enabled ? "default" : "default"}
            >
              <div className="flex items-center gap-4">
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => toggle(value)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    slot.enabled ? "bg-orange" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      slot.enabled ? "left-7" : "left-1"
                    }`}
                  />
                </button>

                {/* Day label */}
                <span className={`w-28 font-medium ${!slot.enabled ? "text-grey-mid" : ""}`}>
                  {label}
                </span>

                {/* Time pickers */}
                {slot.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => setTime(value, "start_time", e.target.value)}
                      className="input text-small py-1 px-2"
                    />
                    <span className="text-grey-mid text-small">to</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => setTime(value, "end_time", e.target.value)}
                      className="input text-small py-1 px-2"
                    />
                  </div>
                ) : (
                  <span className="text-small text-grey-mid italic">Unavailable</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const all: WeekGrid = {};
            DAYS.forEach(({ value }) => {
              all[value] = { enabled: true, start_time: DEFAULT_START, end_time: DEFAULT_END };
            });
            setGrid(all);
          }}
        >
          Enable all days
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const none: WeekGrid = {};
            DAYS.forEach(({ value }) => {
              none[value] = { ...grid[value], enabled: false };
            });
            setGrid(none);
          }}
        >
          Clear all
        </Button>
      </div>
    </div>
  );
}
