import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Button from "@/components/Button";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"verifying" | "success" | "error">("verifying");

  const verifyMutation = useMutation({
    mutationFn: (token: string) =>
      apiClient.post("/auth/verify-email/", { token }).then((r) => r.data),
    onSuccess: () => setState("success"),
    onError: () => setState("error"),
  });

  useEffect(() => {
    if (token) verifyMutation.mutate(token);
    else setState("error");
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-alt">
      <div className="w-full max-w-md bg-white rounded-card border border-border p-10 text-center">
        {state === "verifying" && (
          <>
            <Loader2 className="h-12 w-12 text-orange animate-spin mx-auto mb-4" />
            <h1 className="text-h3">Verifying your email…</h1>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle className="h-14 w-14 text-success mx-auto mb-4" />
            <h1 className="text-h2 mb-2">Email verified!</h1>
            <p className="text-small text-grey-mid mb-8">
              Your email address has been confirmed. You're all set.
            </p>
            <Link to="/login">
              <Button fullWidth>Continue to login</Button>
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="h-14 w-14 text-error mx-auto mb-4" />
            <h1 className="text-h2 mb-2">Link expired</h1>
            <p className="text-small text-grey-mid mb-8">
              This verification link is invalid or has already been used.
              Log in and request a new one.
            </p>
            <Link to="/login">
              <Button fullWidth>Go to login</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
