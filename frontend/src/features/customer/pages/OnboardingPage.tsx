import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { profilesApi } from "@/api/profiles";
import { useAuthStore } from "@/store/auth";
import Button from "@/components/Button";
import Input from "@/components/Input";

const schema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  line1: z.string().min(5, "Enter your street address"),
  area: z.string().min(1, "Select your area"),
  city: z.string().default("Lagos"),
  state: z.string().default("Lagos"),
});
type FormValues = z.infer<typeof schema>;

const LAGOS_AREAS = [
  "Lekki Phase 1", "Victoria Island", "Ikoyi", "Ajah", "Ikeja",
  "Yaba", "Surulere", "Magodo", "Gbagada", "Maryland", "Festac",
];

export default function CustomerOnboarding() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      city: "Lagos",
      state: "Lagos",
    },
  });

  const mutation = useMutation({
    mutationFn: profilesApi.customerOnboarding,
    onSuccess: () => {
      toast.success("Welcome to CleanNG!");
      navigate("/search");
    },
    onError: () => toast.error("Something went wrong. Try again."),
  });

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-1 mb-8">
            <span className="text-xl font-extrabold text-orange">Clean</span>
            <span className="text-xl font-extrabold text-black">NG</span>
          </Link>

          <h1 className="text-h2 mb-1">One last step</h1>
          <p className="text-small text-grey-mid mb-8">
            Tell us your name and where you'd like cleaners to come.
          </p>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First name"
                placeholder="Ada"
                error={errors.first_name?.message}
                {...register("first_name")}
              />
              <Input
                label="Last name"
                placeholder="Obi"
                error={errors.last_name?.message}
                {...register("last_name")}
              />
            </div>

            <Input
              label="Street address"
              placeholder="12 Admiralty Way"
              error={errors.line1?.message}
              {...register("line1")}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-black">Area</label>
              <select className="input" {...register("area")}>
                <option value="">Select your area</option>
                {LAGOS_AREAS.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
              {errors.area && <p className="text-caption text-error">{errors.area.message}</p>}
            </div>

            <Button type="submit" fullWidth loading={mutation.isPending}>
              Find cleaners near me
            </Button>

            <p className="text-center text-caption text-grey-light">
              You can add more addresses later from your account settings.
            </p>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-orange items-center justify-center p-12">
        <div className="text-center">
          <div className="text-6xl mb-6">🏠</div>
          <h2 className="text-h1 text-white mb-4">Almost there!</h2>
          <p className="text-body text-orange-light max-w-sm">
            We'll use your address to find the best verified cleaners near you.
          </p>
        </div>
      </div>
    </div>
  );
}
