import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { profilesApi } from "@/api/profiles";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { X } from "lucide-react";
import { useState } from "react";

const LAGOS_AREAS = [
  "Lekki Phase 1", "Lekki Phase 2", "Victoria Island", "Ikoyi", "Ajah",
  "Ikeja", "Yaba", "Surulere", "Magodo", "Gbagada", "Maryland",
  "Ojodu", "Agege", "Isolo", "Oshodi", "Festac", "Badagry",
];

const schema = z.object({
  bio: z.string().min(50, "Bio must be at least 50 characters").max(500),
  years_experience: z.coerce.number().int().min(0).max(50),
  service_areas: z.array(z.string()).min(1, "Select at least one area"),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function Step3BioAreas({ onNext, onBack }: Props) {
  const [areaInput, setAreaInput] = useState("");

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bio: "", years_experience: 0, service_areas: [] },
  });

  const selectedAreas = watch("service_areas");
  const bioValue = watch("bio");

  const mutation = useMutation({
    mutationFn: profilesApi.onboardingStep3,
    onSuccess: () => { toast.success("Saved!"); onNext(); },
    onError: () => toast.error("Failed to save. Try again."),
  });

  const addArea = (area: string) => {
    if (!selectedAreas.includes(area)) {
      setValue("service_areas", [...selectedAreas, area], { shouldValidate: true });
    }
    setAreaInput("");
  };

  const removeArea = (area: string) => {
    setValue("service_areas", selectedAreas.filter((a) => a !== area), { shouldValidate: true });
  };

  const filteredSuggestions = LAGOS_AREAS.filter(
    (a) => a.toLowerCase().includes(areaInput.toLowerCase()) && !selectedAreas.includes(a)
  );

  return (
    <div className="bg-white rounded-card border border-border p-8">
      <h1 className="text-h2 mb-1">Your services & areas</h1>
      <p className="text-small text-grey-mid mb-8">
        Tell customers what makes you great and where you're available.
      </p>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        {/* Bio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black">
            Bio <span className="text-grey-light font-normal">({bioValue.length}/500)</span>
          </label>
          <textarea
            rows={4}
            placeholder="I'm a professional cleaner with 5 years of experience specialising in deep cleaning residential homes in Lagos. I'm detail-oriented, reliable, and bring my own eco-friendly supplies."
            className={`input resize-none ${errors.bio ? "border-error" : ""}`}
            {...register("bio")}
          />
          {errors.bio && <p className="text-caption text-error">{errors.bio.message}</p>}
        </div>

        {/* Years of experience */}
        <Input
          label="Years of experience"
          type="number"
          min={0}
          max={50}
          placeholder="0"
          error={errors.years_experience?.message}
          {...register("years_experience")}
        />

        {/* Service areas */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black">Service areas</label>
          <p className="text-caption text-grey-light">Add the Lagos areas where you offer your services.</p>

          {/* Selected areas */}
          {selectedAreas.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedAreas.map((area) => (
                <span key={area} className="badge-orange badge flex items-center gap-1.5">
                  {area}
                  <button type="button" onClick={() => removeArea(area)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              placeholder="Search or type an area…"
              className="input"
            />
            {areaInput && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-white border border-border rounded-input shadow-md mt-1 max-h-48 overflow-y-auto">
                {filteredSuggestions.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => addArea(area)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-light hover:text-orange transition-colors"
                  >
                    {area}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick picks */}
          <div className="flex flex-wrap gap-2 mt-2">
            {LAGOS_AREAS.filter((a) => !selectedAreas.includes(a)).slice(0, 8).map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => addArea(area)}
                className="badge badge-grey hover:badge-orange cursor-pointer transition-colors"
              >
                + {area}
              </button>
            ))}
          </div>

          {errors.service_areas && (
            <p className="text-caption text-error">{errors.service_areas.message}</p>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1" type="button">
            Back
          </Button>
          <Button type="submit" className="flex-1" loading={mutation.isPending}>
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}
