import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: object) => void;
        };
      };
    };
  }
}

interface Props {
  role?: "CUSTOMER" | "CLEANER";
  className?: string;
}

export default function GoogleAuthButton({ role = "CUSTOMER", className }: Props) {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const mutation = useMutation({
    mutationFn: ({ id_token }: { id_token: string }) =>
      authApi.googleAuth(id_token, role),
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.access, data.tokens.refresh);
      toast.success(`Welcome, ${data.user.first_name}!`);
      const redirect =
        data.user.role === "CLEANER" ? "/cleaner/onboarding" :
        data.user.role === "ADMIN" ? "/admin" : "/customer/onboarding";
      navigate(redirect, { replace: true });
    },
    onError: () => toast.error("Google sign-in failed. Try again."),
  });

  const handleGoogleResponse = useCallback(
    (response: { credential: string }) => {
      mutation.mutate({ id_token: response.credential });
    },
    [mutation]
  );

  // Dynamically load Google Identity Services and render button
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) return;

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.google?.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });
        window.google?.accounts.id.renderButton(node, {
          type: "standard",
          shape: "pill",
          theme: "outline",
          text: "continue_with",
          size: "large",
          width: node.offsetWidth || 360,
        });
      };
      document.body.appendChild(script);
    },
    [handleGoogleResponse]
  );

  return (
    <div className={cn("w-full", className)}>
      <div ref={containerRef} className="w-full flex justify-center" />
      {mutation.isPending && (
        <p className="text-caption text-center text-grey-light mt-2">Signing in…</p>
      )}
    </div>
  );
}
