import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "@/api/client";
import Button from "@/components/Button";
import Input from "@/components/Input";

const schema = z
  .object({
    new_password: z.string().min(8, "At least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      apiClient.post("/auth/password-reset/confirm/", {
        token,
        new_password: data.new_password,
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Password reset! Please log in.");
      navigate("/login");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || "Invalid or expired link.";
      toast.error(msg);
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-h2 mb-4">Invalid link</h1>
          <Link to="/forgot-password" className="text-orange underline">Request a new one</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-alt">
      <div className="w-full max-w-md bg-white rounded-card border border-border p-8">
        <Link to="/" className="flex items-center gap-1 mb-8">
          <span className="text-xl font-extrabold text-orange">Clean</span>
          <span className="text-xl font-extrabold text-black">NG</span>
        </Link>

        <h1 className="text-h2 mb-2">Set a new password</h1>
        <p className="text-small text-grey-mid mb-8">Choose something strong — at least 8 characters.</p>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
          <Input
            label="New password"
            type="password"
            placeholder="Min 8 characters"
            error={errors.new_password?.message}
            {...register("new_password")}
          />
          <Input
            label="Confirm password"
            type="password"
            placeholder="Repeat new password"
            error={errors.confirm_password?.message}
            {...register("confirm_password")}
          />
          <Button type="submit" fullWidth loading={mutation.isPending}>
            Reset password
          </Button>
        </form>
      </div>
    </div>
  );
}
