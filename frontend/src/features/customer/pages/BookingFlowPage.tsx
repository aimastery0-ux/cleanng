import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { profilesApi } from "@/api/profiles";
import { bookingsApi, CreateBookingPayload } from "@/api/bookings";
import Button from "@/components/Button";
import Card from "@/components/Card";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const COMMISSION_RATE = 0.175;

function formatNGN(amount: number | string) {
  return `₦${Number(amount).toLocaleString()}`;
}

function getAvailableDates(availabilityDays: number[], weeksAhead = 8): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let d = 1; d <= weeksAhead * 7; d++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + d);
    // JS getDay: 0=Sun,1=Mon. Our API: 0=Mon,1=Tue,6=Sun
    const apiDay = dt.getDay() === 0 ? 6 : dt.getDay() - 1;
    if (availabilityDays.includes(apiDay)) dates.push(dt);
  }
  return dates;
}

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

// ── Step components ───────────────────────────────────────────────────────────

interface StepProps {
  onNext: (data: Partial<Draft>) => void;
  onBack: () => void;
  draft: Draft;
}

interface Draft {
  service_id?: number;
  service_title?: string;
  service_price?: string;
  address_id?: number;
  address_label?: string;
  address_line1?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  notes?: string;
}

function Step1Service({ onNext, draft, profile }: StepProps & { profile: any }) {
  const [selected, setSelected] = useState<number | undefined>(draft.service_id);

  const activeServices = profile.services?.filter((s: any) => s.is_active) ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-bold">Choose a service</h2>
      {activeServices.length === 0 ? (
        <p className="text-grey-mid">This cleaner has no active services.</p>
      ) : (
        <div className="space-y-3">
          {activeServices.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`w-full text-left card p-4 transition-all ${
                selected === s.id ? "border-orange bg-orange-light" : "hover:border-orange"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-small text-grey-mid">{s.type.replace(/_/g, " ")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange">{formatNGN(s.price)}</p>
                  <p className="text-caption text-grey-mid">/{s.pricing_unit.replace("PER_", "").toLowerCase()}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <Button
        fullWidth
        disabled={!selected}
        onClick={() => {
          const svc = activeServices.find((s: any) => s.id === selected);
          if (svc) onNext({ service_id: svc.id, service_title: svc.title, service_price: svc.price });
        }}
      >
        Continue
      </Button>
    </div>
  );
}

function Step2DateTime({ onNext, onBack, draft, profile }: StepProps & { profile: any }) {
  const availabilityDays: number[] = profile.availability?.map((a: any) => a.day_of_week) ?? [];
  const availableDates = getAvailableDates(availabilityDays);

  const [selectedDate, setSelectedDate] = useState<string | undefined>(draft.scheduled_date);
  const [selectedTime, setSelectedTime] = useState<string>(draft.scheduled_time ?? "09:00");

  const TIME_SLOTS = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00",
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-h3 font-bold">Pick a date & time</h2>

      {availabilityDays.length === 0 && (
        <p className="text-grey-mid text-small">This cleaner hasn't set their availability yet.</p>
      )}

      <div>
        <p className="text-small font-medium mb-2 text-grey-dark">
          Available days: {availabilityDays.map((d) => DAY_NAMES[d]).join(", ")}
        </p>
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
          {availableDates.slice(0, 28).map((d) => {
            const iso = isoDate(d);
            const label = d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
            const dayName = d.toLocaleDateString("en-NG", { weekday: "short" });
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className={`py-2 px-1 rounded-input text-center text-small transition-all ${
                  selectedDate === iso
                    ? "bg-orange text-white font-semibold"
                    : "bg-bg-alt hover:bg-orange-light hover:text-orange"
                }`}
              >
                <span className="block text-caption">{dayName}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-small font-medium mb-2 text-grey-dark">Select time</p>
        <div className="grid grid-cols-3 gap-2">
          {TIME_SLOTS.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTime(t)}
              className={`py-2 rounded-input text-small transition-all ${
                selectedTime === t
                  ? "bg-orange text-white font-semibold"
                  : "bg-bg-alt hover:bg-orange-light hover:text-orange"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button
          fullWidth
          disabled={!selectedDate}
          onClick={() => onNext({ scheduled_date: selectedDate, scheduled_time: selectedTime })}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function Step3Address({ onNext, onBack, draft }: StepProps) {
  const { data: addresses = [] } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => profilesApi.getAddresses(),
  });

  const [selected, setSelected] = useState<number | undefined>(draft.address_id);

  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-bold">Cleaning address</h2>

      {addresses.length === 0 ? (
        <Card padding="md">
          <p className="text-grey-mid text-small">
            No saved addresses. Add one in your profile settings first.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <button
              key={addr.id}
              onClick={() => setSelected(addr.id)}
              className={`w-full text-left card p-4 transition-all ${
                selected === addr.id ? "border-orange bg-orange-light" : "hover:border-orange"
              }`}
            >
              <p className="font-semibold">{addr.label || "Address"}</p>
              <p className="text-small text-grey-mid">{addr.line1}, {addr.area}</p>
              <p className="text-caption text-grey-light">{addr.city}, {addr.state}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button
          fullWidth
          disabled={!selected}
          onClick={() => {
            const addr = addresses.find((a) => a.id === selected);
            if (addr) onNext({
              address_id: addr.id,
              address_label: addr.label,
              address_line1: addr.line1,
            });
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function Step4Review({
  onBack,
  draft,
  cleanerName,
  cleanerAvatar,
  onConfirm,
  isSubmitting,
}: {
  onBack: () => void;
  draft: Draft;
  cleanerName: string;
  cleanerAvatar?: string;
  onConfirm: (notes: string) => void;
  isSubmitting: boolean;
}) {
  const [notes, setNotes] = useState(draft.notes ?? "");
  const total = Number(draft.service_price ?? 0);
  const commission = Math.round(total * COMMISSION_RATE);
  const cleaner_receives = total - commission;

  return (
    <div className="space-y-6">
      <h2 className="text-h3 font-bold">Review your booking</h2>

      <Card padding="md" className="space-y-3">
        {/* Cleaner */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          {cleanerAvatar ? (
            <img src={cleanerAvatar} className="w-10 h-10 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-bg-alt flex items-center justify-center">👤</div>
          )}
          <p className="font-semibold">{cleanerName}</p>
        </div>

        <div className="space-y-2 text-small">
          <div className="flex justify-between">
            <span className="text-grey-mid">Service</span>
            <span className="font-medium">{draft.service_title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-grey-mid">Date</span>
            <span className="font-medium">
              {new Date(draft.scheduled_date!).toLocaleDateString("en-NG", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-grey-mid">Time</span>
            <span className="font-medium">{draft.scheduled_time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-grey-mid">Address</span>
            <span className="font-medium text-right max-w-40 truncate">
              {draft.address_label || draft.address_line1}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-border space-y-1.5 text-small">
          <div className="flex justify-between">
            <span className="text-grey-mid">Service fee</span>
            <span>{formatNGN(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-grey-mid">Platform fee (17.5%)</span>
            <span className="text-grey-mid">{formatNGN(commission)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
            <span>Total you pay</span>
            <span className="text-orange">{formatNGN(total)}</span>
          </div>
          <p className="text-caption text-grey-light">
            Cleaner receives {formatNGN(cleaner_receives)} after platform fee.
            Funds held in escrow until you confirm completion.
          </p>
        </div>
      </Card>

      <div>
        <label className="block text-small font-medium mb-1.5">Notes for cleaner (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any special instructions, access details, pets, etc."
          className="input w-full resize-none"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button fullWidth loading={isSubmitting} onClick={() => onConfirm(notes)}>
          Confirm booking
        </Button>
      </div>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

const STEPS = ["Service", "Date & Time", "Address", "Confirm"];

export default function BookingFlowPage() {
  const { cleanerId } = useParams<{ cleanerId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({});

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-cleaner", Number(cleanerId)],
    queryFn: () => profilesApi.getPublicCleanerProfile(Number(cleanerId)),
    enabled: !!cleanerId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateBookingPayload) => bookingsApi.create(payload),
    onSuccess: (booking) => {
      toast.success("Booking confirmed! The cleaner will respond shortly.");
      navigate(`/customer/bookings/${booking.id}`);
    },
    onError: (err: any) => {
      const detail =
        err?.response?.data?.detail ||
        Object.values(err?.response?.data ?? {})?.[0] ||
        "Failed to create booking.";
      toast.error(String(detail));
    },
  });

  const handleNext = (data: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleConfirm = (notes: string) => {
    createMutation.mutate({
      cleaner_id: Number(cleanerId),
      service_id: draft.service_id!,
      address_id: draft.address_id!,
      scheduled_date: draft.scheduled_date!,
      scheduled_time: draft.scheduled_time!,
      notes,
    });
  };

  if (isLoading || !profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-bg-alt animate-pulse rounded-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      {/* Cleaner header */}
      <div className="flex items-center gap-3 mb-8">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} className="w-12 h-12 rounded-full object-cover border border-border" alt="" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-bg-alt flex items-center justify-center">👤</div>
        )}
        <div>
          <p className="font-bold">{profile.full_name}</p>
          <p className="text-small text-grey-mid">Book a cleaning session</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`text-caption ${i === step ? "text-orange font-semibold" : i < step ? "text-success" : "text-grey-light"}`}
            >
              {i < step ? "✓ " : ""}{label}
            </span>
          ))}
        </div>
        <div className="h-1.5 bg-border rounded-full">
          <div
            className="h-1.5 bg-orange rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <Card padding="lg">
        {step === 0 && (
          <Step1Service onNext={handleNext} onBack={handleBack} draft={draft} profile={profile} />
        )}
        {step === 1 && (
          <Step2DateTime onNext={handleNext} onBack={handleBack} draft={draft} profile={profile} />
        )}
        {step === 2 && (
          <Step3Address onNext={handleNext} onBack={handleBack} draft={draft} />
        )}
        {step === 3 && (
          <Step4Review
            onBack={handleBack}
            draft={draft}
            cleanerName={profile.full_name}
            cleanerAvatar={profile.avatar_url}
            onConfirm={handleConfirm}
            isSubmitting={createMutation.isPending}
          />
        )}
      </Card>
    </div>
  );
}
