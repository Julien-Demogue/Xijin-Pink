import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Clock, PartyPopper, XCircle } from "lucide-react";
import type { TransactionStatus } from "@/types/transaction";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { TransactionStatusBadge } from "@/components/features/history/TransactionStatusBadge";
import { formatCents, formatDateTime } from "@/lib/format";

interface DonationSuccessProps {
  reference: string;
  amountCents: number;
  createdAt: string;
  status: TransactionStatus;
  showHistoryLink: boolean;
  note?: ReactNode;
}

const STATUS_CONTENT: Record<TransactionStatus, { icon: typeof PartyPopper; title: string; subtitle: string }> = {
  paid: {
    icon: PartyPopper,
    title: "Merci pour votre générosité !",
    subtitle: "Votre don a été traité avec succès.",
  },
  failed: {
    icon: XCircle,
    title: "Le paiement n'a pas abouti",
    subtitle: "Vous pouvez réessayer quand vous le souhaitez.",
  },
  pending: {
    icon: Clock,
    title: "Don transmis",
    subtitle: "Nous attendons la confirmation du paiement.",
  },
};

export function DonationSuccess({
  reference,
  amountCents,
  createdAt,
  status,
  showHistoryLink,
  note,
}: DonationSuccessProps) {
  const content = STATUS_CONTENT[status];
  const Icon = content.icon;

  return (
    <Card variant="elevated" className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary-soft text-brand-accent">
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900">{content.title}</p>
        <p className="mt-1 text-sm text-gray-500">{content.subtitle}</p>
      </div>

      <dl className="grid w-full grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 text-left text-sm">
        <div>
          <dt className="text-gray-500">Montant</dt>
          <dd className="font-semibold text-gray-900">{formatCents(amountCents)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Date</dt>
          <dd className="font-semibold text-gray-900">{formatDateTime(createdAt)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Référence</dt>
          <dd className="truncate font-semibold text-gray-900">{reference}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Statut</dt>
          <dd>
            <TransactionStatusBadge status={status} />
          </dd>
        </div>
      </dl>

      {note && <Alert tone="success">{note}</Alert>}

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Link to="/don" className="w-full">
          <Button variant="outline" fullWidth>
            Faire un autre don
          </Button>
        </Link>
        {showHistoryLink && (
          <Link to="/historique" className="w-full">
            <Button fullWidth>Voir mon historique</Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
