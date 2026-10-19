import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { TransactionStatus } from "@/types/transaction";
import { Badge } from "@/components/ui/Badge";

const STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; tone: "success" | "warning" | "danger"; icon: typeof CheckCircle2 }
> = {
  paid: { label: "Payé", tone: "success", icon: CheckCircle2 },
  pending: { label: "En attente", tone: "warning", icon: Clock },
  failed: { label: "Échoué", tone: "danger", icon: XCircle },
};

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge tone={config.tone} icon={<Icon className="h-3.5 w-3.5" />}>
      {config.label}
    </Badge>
  );
}
