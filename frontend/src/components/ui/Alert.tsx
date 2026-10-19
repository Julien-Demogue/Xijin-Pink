import type { ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type AlertTone = "success" | "error";

interface AlertProps {
  tone: AlertTone;
  children: ReactNode;
}

const TONE_CLASSES: Record<AlertTone, string> = {
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  error: "bg-red-50 text-red-800 border-red-200",
};

const TONE_ICONS: Record<AlertTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
};

export function Alert({ tone, children }: AlertProps) {
  const Icon = TONE_ICONS[tone];
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm",
        TONE_CLASSES[tone],
      )}
      role="alert"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
