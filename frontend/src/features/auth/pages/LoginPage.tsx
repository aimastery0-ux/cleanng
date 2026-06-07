import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import Button from "@/components/Button";
import Input from "@/components/Input";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.access, data.tokens.refresh);
      toast.success(`Welcome back, ${data.user.first_name}!`);
      const redirect =
        data.user.role === "CLEANER" ? "/cleaner/dashboard" :
        data.user.role === "ADMIN" ? "/admin" :
        from !== "/login" && from !== "/register" ? from : "/customer";
      navigate(redirect, { replace: true });
    },
    onError: () => {
      toast.error("Invalid email or password.");
    },
  });

  return (
    <div className="min-h-screen flex">
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-1 mb-8">
            <span className="text-xl font-extrabold text-orange">Clean</span>
            <span className="text-xl font-extrabold text-black">NG</span>
          </Link>

          <h1 className="text-h1 mb-2">Welcome back</h1>
          <p className="text-body text-grey-mid mb-8">Log in to your CleanNG account.</p>

          <form onSubmit={handleSubmit((d) => loginMutation.mutate(d))} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" fullWidth loading={loginMutation.isPending}>
              Log in
            </Button>
          </form>

          <p className="mt-6 text-center text-small text-grey-mid">
            Don't have an account?{" "}
            <Link to="/register" className="text-orange font-medium hover:underline">
              Get started
            </Link>
          </p>
        </div>
      </div>

      {/* Right: brand */}
      <div className="hidden lg:flex flex-1 bg-black items-center justify-center p-12">
        <div className="text-center">
          <div className="text-6xl mb-6">🧹</div>
          <h2 className="text-h1 text-white mb-4">Clean home,<br />clear mind.</h2>
          <p className="text-body text-grey-light max-w-sm">
            Nigeria's most trusted cleaning marketplace.
          </p>
        </div>
      </div>
    </div>
  );
}
