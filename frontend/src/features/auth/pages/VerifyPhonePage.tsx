import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import Button from "@/components/Button";

const CODE_LENGTH = 6;

export default function VerifyPhonePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phone = user?.phone || "";

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const verifyMutation = useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) =>
      authApi.verifyOtp(phone, code),
    onSuccess: () => {
      if (user) setUser({ ...user, is_phone_verified: true });
      toast.success("Phone verified!");
      navigate(user?.role === "CLEANER" ? "/cleaner/onboarding" : "/customer/onboarding");
    },
    onError: () => {
      toast.error("Invalid code. Please try again.");
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => authApi.sendOtp(phone),
    onSuccess: () => {
      toast.success("New code sent!");
      setResendCooldown(60);
    },
    onError: () => toast.error("Failed to resend. Try again."),
  });

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newDigits.join("");
    if (code.length === CODE_LENGTH && !code.includes("")) {
      verifyMutation.mutate({ phone, code });
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (pasted.length === CODE_LENGTH) {
      setDigits(pasted.split(""));
      verifyMutation.mutate({ phone, code: pasted });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-alt">
      <div className="w-full max-w-md bg-white rounded-card border border-border p-8 text-center">
        <div className="text-4xl mb-4">📱</div>
        <h1 className="text-h2 mb-2">Verify your phone</h1>
        <p className="text-small text-grey-mid mb-8">
          We sent a 6-digit code to{" "}
          <strong className="text-black">{phone || "your phone"}</strong>.
        </p>

        {/* Code inputs */}
        <div className="flex justify-center gap-3 mb-8" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-xl font-bold border-[1.5px] rounded-input outline-none transition-all ${
                digit
                  ? "border-orange bg-orange-light text-orange"
                  : "border-border focus:border-orange focus:shadow-input-focus"
              }`}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        {verifyMutation.isPending && (
          <div className="flex items-center justify-center gap-2 mb-6 text-small text-grey-mid">
            <div className="h-4 w-4 border-2 border-orange border-t-transparent rounded-full animate-spin" />
            Verifying…
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          disabled={resendCooldown > 0 || resendMutation.isPending}
          loading={resendMutation.isPending}
          onClick={() => resendMutation.mutate()}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </Button>
      </div>
    </div>
  );
}
