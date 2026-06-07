import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import Button from "@/components/Button";
import Input from "@/components/Input";

const schema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, "Enter a valid phone number").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  password_confirm: z.string(),
}).refine((d) => d.password === d.password_confirm, {
  message: "Passwords do not match",
  path: ["password_confirm"],
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const roleParam = params.get("role");
  const role = roleParam === "cleaner" ? "CLEANER" : "CUSTOMER";
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const registerMutation = useMutation({
    mutationFn: (values: FormValues) =>
      authApi.register({ ...values, role, phone: values.phone || undefined }),
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.access, data.tokens.refresh);
      toast.success("Account created!");
      navigate(role === "CLEANER" ? "/cleaner/onboarding" : "/customer", { replace: true });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.email?.[0] || err?.response?.data?.detail || "Registration failed.";
      toast.error(msg);
    },
  });

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-1 mb-8">
            <span className="text-xl font-extrabold text-orange">Clean</span>
            <span className="text-xl font-extrabold text-black">NG</span>
          </Link>

          {/* Role toggle */}
          <div className="flex gap-2 mb-8 bg-bg-alt p-1 rounded-pill">
            {(["CUSTOMER", "CLEANER"] as const).map((r) => (
              <Link
                key={r}
                to={`/register?role=${r.toLowerCase()}`}
                className={`flex-1 text-center py-2 rounded-pill text-sm font-medium transition-colors ${
                  role === r ? "bg-orange text-white" : "text-grey-mid hover:text-black"
                }`}
              >
                {r === "CUSTOMER" ? "I need cleaning" : "I'm a cleaner"}
              </Link>
            ))}
          </div>

          <h1 className="text-h2 mb-2">
            {role === "CLEANER" ? "Join as a cleaner" : "Find your cleaner"}
          </h1>
          <p className="text-small text-grey-mid mb-8">Create your free CleanNG account.</p>

          <form onSubmit={handleSubmit((d) => registerMutation.mutate(d))} className="space-y-4">
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
              label="Email address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Phone number"
              type="tel"
              placeholder="+234 801 234 5678"
              error={errors.phone?.message}
              hint="Optional — required later to verify your account"
              {...register("phone")}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min 8 characters"
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="Repeat password"
              error={errors.password_confirm?.message}
              {...register("password_confirm")}
            />

            <Button type="submit" fullWidth loading={registerMutation.isPending}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-small text-grey-mid">
            Already have an account?{" "}
            <Link to="/login" className="text-orange font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-orange items-center justify-center p-12">
        <div className="text-center">
          <div className="text-6xl mb-6">{role === "CLEANER" ? "💼" : "✨"}</div>
          <h2 className="text-h1 text-white mb-4">
            {role === "CLEANER" ? "Earn doing what\nyou love" : "Your space,\ntransformed"}
          </h2>
          <p className="text-body text-orange-light max-w-sm">
            {role === "CLEANER"
              ? "Set your own rates, choose your hours, and get paid securely."
              : "Book in minutes. Pay only when you're satisfied with the result."}
          </p>
        </div>
      </div>
    </div>
  );
}
