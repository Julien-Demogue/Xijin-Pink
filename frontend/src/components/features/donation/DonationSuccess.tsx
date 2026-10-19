import { Link } from "react-router-dom";
import { PartyPopper } from "lucide-react";
import type { Transaction } from "@/types/transaction";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { TransactionStatusBadge } from "@/components/features/history/TransactionStatusBadge";
import { formatDateTime, formatEuros } from "@/lib/format";

interface DonationSuccessProps {
  transaction: Transaction;
  isAuthenticated: boolean;
  onReset: () => void;
}

export function DonationSuccess({ transaction, isAuthenticated, onReset }: DonationSuccessProps) {
  return (
    <Card variant="elevated" className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary-soft text-brand-accent">
        <PartyPopper className="h-7 w-7" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900">Merci pour votre générosité !</p>
        <p className="mt-1 text-sm text-gray-500">Votre don a été traité avec succès.</p>
      </div>

      <dl className="grid w-full grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 text-left text-sm">
        <div>
          <dt className="text-gray-500">Montant</dt>
          <dd className="font-semibold text-gray-900">{formatEuros(transaction.amount)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Date</dt>
          <dd className="font-semibold text-gray-900">{formatDateTime(transaction.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Référence</dt>
          <dd className="font-semibold text-gray-900">{transaction.id}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Statut</dt>
          <dd>
            <TransactionStatusBadge status={transaction.status} />
          </dd>
        </div>
      </dl>

      {!isAuthenticated && (
        <Alert tone="success">
          Connectez-vous pour retrouver ce don dans votre historique.
        </Alert>
      )}

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button variant="outline" fullWidth onClick={onReset}>
          Faire un autre don
        </Button>
        {isAuthenticated && (
          <Link to="/historique" className="w-full">
            <Button fullWidth>Voir mon historique</Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
