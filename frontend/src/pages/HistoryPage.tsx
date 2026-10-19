import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HandCoins } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Table, type TableColumn } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { TransactionStatusBadge } from "@/components/features/history/TransactionStatusBadge";
import { DonorTierBadge } from "@/components/features/leaderboard/DonorTierBadge";
import { formatCents, formatDate } from "@/lib/format";
import { ApiError, donationsHistory, donationsSummary } from "@/lib/apiClient";
import type { Transaction } from "@/types/transaction";
import type { DonationSummary } from "@/types/summary";

const columns: Array<TableColumn<Transaction>> = [
  {
    header: "Date",
    render: (row) => <span className="text-gray-600">{formatDate(row.createdAt)}</span>,
  },
  {
    header: "Montant",
    render: (row) => <span className="font-semibold text-gray-900">{formatCents(row.amountCents)}</span>,
  },
  {
    header: "Statut",
    render: (row) => <TransactionStatusBadge status={row.status} />,
  },
  {
    header: "Référence",
    render: (row) => <span className="font-mono text-xs text-gray-500">{row.reference}</span>,
  },
];

export function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [summary, setSummary] = useState<DonationSummary | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.all([donationsHistory(), donationsSummary()])
      .then(([historyResult, summaryResult]) => {
        setTransactions(historyResult);
        setSummary(summaryResult);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Impossible de charger votre historique."),
      );
  }, []);

  const sortedTransactions = transactions
    ? [...transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  return (
    <PageContainer className="py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes dons</h1>
          <p className="mt-2 text-gray-600">Retrouvez l'historique de vos transactions.</p>
        </div>
        {summary && summary.donationCount > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3">
            <div className="text-right">
              <p className="text-xs text-gray-500">Total donné</p>
              <p className="font-semibold text-gray-900">{formatCents(summary.totalCents)}</p>
            </div>
            <DonorTierBadge title={summary.title} />
          </div>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {!error && !transactions && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {transactions && sortedTransactions.length === 0 && (
        <EmptyState
          icon={HandCoins}
          title="Aucune transaction pour le moment"
          description="Vous n'avez pas encore fait de don. Chaque contribution compte."
          action={
            <Link to="/don">
              <Button>Faire un don</Button>
            </Link>
          }
        />
      )}

      {transactions && sortedTransactions.length > 0 && (
        <Table columns={columns} rows={sortedTransactions} rowKey={(row) => row.reference} />
      )}
    </PageContainer>
  );
}
