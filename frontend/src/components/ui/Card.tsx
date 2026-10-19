import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "elevated" | "soft";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "bg-white border border-gray-200",
  elevated: "bg-white border border-gray-100 shadow-lg shadow-gray-200/50",
  soft: "bg-brand-primary-soft border border-brand-primary-light/40",
};

export function Card({ variant = "default", className, children, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-2xl p-6", VARIANT_CLASSES[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
