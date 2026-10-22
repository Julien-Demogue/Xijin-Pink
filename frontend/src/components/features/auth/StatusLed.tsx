import { cn } from "@/lib/cn";

export type LedState = "off" | "green-blink" | "green" | "red";

const DOT_CLASSES: Record<LedState, string> = {
  off: "bg-gray-300",
  "green-blink": "bg-emerald-500 shadow-[0_0_14px_2px_rgba(16,185,129,0.7)] animate-led-blink",
  green: "bg-emerald-500 shadow-[0_0_14px_2px_rgba(16,185,129,0.7)]",
  red: "bg-red-500 shadow-[0_0_14px_2px_rgba(239,68,68,0.7)]",
};

const LABELS: Record<LedState, string> = {
  off: "LED éteinte",
  "green-blink": "Visage reconnu",
  green: "Accès autorisé",
  red: "Accès refusé",
};

export function StatusLed({ state }: { state: LedState }) {
  return (
    <span
      role="status"
      aria-label={LABELS[state]}
      title={LABELS[state]}
      className={cn(
        "inline-block h-4 w-4 flex-none rounded-full border border-black/10 transition-colors",
        DOT_CLASSES[state],
      )}
    />
  );
}
