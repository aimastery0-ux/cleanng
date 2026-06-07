import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "@/api/client";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { CheckCircle } from "lucide-react";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      apiClient.post("/auth/password-reset/", data).then((r) => r.data),
    onError: () => toast.error("Something went wrong. Try again."),
  });

  if (mutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-bg-alt">
        <div className="w-full max-w-md bg-white rounded-card border border-border p-10 text-center">
          <CheckCircle className="h-14 w-14 text-success mx-auto mb-4" />
          <h1 className="text-h2 mb-2">Check your email</h1>
          <p className="text-small text-grey-mid mb-8">
            If an account exists for that email, we've sent a reset link. It expires in 2 hours.
          </p>
          <Link to="/login"><Button fullWidth variant="outline">Back to login</Button></Link>
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

        <h1 className="text-h2 mb-2">Forgot your password?</h1>
        <p className="text-small text-grey-mid mb-8">
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Button type="submit" fullWidth loading={mutation.isPending}>
            Send reset link
          </Button>
        </form>

        <p className="mt-6 text-center text-small text-grey-mid">
          Remembered it?{" "}
          <Link to="/login" className="text-orange font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
