import { getInitials } from "@/lib/format";
import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
};

const BACKGROUNDS = ["bg-brand-accent", "bg-brand-primary", "bg-brand-secondary-dark"];

function pickBackground(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BACKGROUNDS[hash % BACKGROUNDS.length];
}

export function Avatar({ name, size = "md" }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        pickBackground(name),
        SIZE_CLASSES[size],
      )}
    >
      {getInitials(name)}
    </div>
  );
}
