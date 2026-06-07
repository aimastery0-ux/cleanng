import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "orange" | "success" | "error" | "dark" | "grey";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  orange: "badge-orange",
  success: "badge-success",
  error: "badge-error",
  dark: "badge-dark",
  grey: "badge-grey",
};

export default function Badge({ variant = "grey", className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(variantClasses[variant], className)} {...props}>
      {children}
    </span>
  );
}
