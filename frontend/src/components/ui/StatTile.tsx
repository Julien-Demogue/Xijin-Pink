import type { LucideIcon } from "lucide-react";

interface StatTileProps {
  icon: LucideIcon;
  value: string;
  label: string;
}

export function StatTile({ icon: Icon, value, label }: StatTileProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary-soft text-brand-accent">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
