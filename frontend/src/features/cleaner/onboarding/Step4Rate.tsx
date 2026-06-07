import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { profilesApi } from "@/api/profiles";
import Button from "@/components/Button";
import { formatNaira } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

const schema = z.object({
  base_hourly_rate: z.coerce
    .number()
    .min(1000, "Minimum rate is ₦1,000/hour")
    .max(100000, "Maximum rate is ₦100,000/hour"),
});
type FormValues = z.infer<typeof schema>;

const RATE_PRESETS = [3000, 4000, 5000, 6500, 8000];

interface Props {
  onDone: () => void;
  onBack: () => void;
}

export default function Step4Rate({ onDone, onBack }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { base_hourly_rate: 5000 },
  });

  const rate = watch("base_hourly_rate");

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      profilesApi.onboardingStep4({ base_hourly_rate: String(data.base_hourly_rate) }),
    onSuccess: () => {
      toast.success("Profile submitted for review!");
      onDone();
    },
    onError: () => toast.error("Failed to save. Try again."),
  });

  return (
    <div className="bg-white rounded-card border border-border p-8">
      <h1 className="text-h2 mb-1">Set your rate</h1>
      <p className="text-small text-grey-mid mb-8">
        This is your base hourly rate. You can adjust it per booking later.
        Lagos cleaners typically charge ₦3,000 – ₦8,000/hr.
      </p>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        {/* Preset buttons */}
        <div>
          <p className="text-sm font-medium text-black mb-3">Quick select</p>
          <div className="flex flex-wrap gap-2">
            {RATE_PRESETS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setValue("base_hourly_rate", r, { shouldValidate: true })}
                className={`px-4 py-2 rounded-pill text-sm font-medium border transition-colors ${
                  Number(rate) === r
                    ? "bg-orange text-white border-orange"
                    : "bg-white text-grey-dark border-border hover:border-orange"
                }`}
              >
                {formatNaira(r)}/hr
              </button>
            ))}
          </div>
        </div>

        {/* Custom input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black">Or enter a custom rate (₦/hr)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-grey-mid font-medium">₦</span>
            <input
              type="number"
              min={1000}
              max={100000}
              step={500}
              className={`input pl-8 ${errors.base_hourly_rate ? "border-error" : ""}`}
              {...register("base_hourly_rate")}
            />
          </div>
          {errors.base_hourly_rate && (
            <p className="text-caption text-error">{errors.base_hourly_rate.message}</p>
          )}
          {!errors.base_hourly_rate && rate >= 1000 && (
            <p className="text-caption text-grey-mid">
              Your take-home per hour after CleanNG's 17.5% commission:{" "}
              <strong className="text-success">{formatNaira(Math.round(Number(rate) * 0.825))}</strong>
            </p>
          )}
        </div>

        {/* What happens next */}
        <div className="bg-bg-alt rounded-card p-5 space-y-3">
          <p className="text-sm font-semibold text-black">What happens next</p>
          {[
            "Our team reviews your ID document (usually within 24 hours)",
            "You'll get an SMS and email once approved",
            "Your profile goes live and customers can start booking you",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <p className="text-small text-grey-dark">{item}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1" type="button">
            Back
          </Button>
          <Button type="submit" className="flex-1" loading={mutation.isPending}>
            Submit profile for review
          </Button>
        </div>
      </form>
    </div>
  );
}
