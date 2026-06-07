import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { profilesApi } from "@/api/profiles";
import { useAuthStore } from "@/store/auth";
import Button from "@/components/Button";
import Input from "@/components/Input";

const schema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  phone: z.string().regex(/^\+?[\d\s\-()]{10,}$/, "Enter a valid Nigerian phone number"),
});
type FormValues = z.infer<typeof schema>;

export default function Step1BasicInfo({ onNext }: { onNext: () => void }) {
  const user = useAuthStore((s) => s.user);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "",
    },
  });

  const mutation = useMutation({
    mutationFn: profilesApi.onboardingStep1,
    onSuccess: () => { toast.success("Saved!"); onNext(); },
    onError: () => toast.error("Failed to save. Please try again."),
  });

  return (
    <div className="bg-white rounded-card border border-border p-8">
      <h1 className="text-h2 mb-1">Tell us about yourself</h1>
      <p className="text-small text-grey-mid mb-8">
        This info appears on your public profile and helps customers trust you.
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
          label="Phone number"
          type="tel"
          placeholder="+234 801 234 5678"
          hint="Customers contact you here — we'll verify it by SMS."
          error={errors.phone?.message}
          {...register("phone")}
        />

        <Button type="submit" fullWidth loading={mutation.isPending}>
          Continue
        </Button>
      </form>
    </div>
  );
}
