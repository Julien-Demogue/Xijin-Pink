import { Link } from "react-router-dom";
import { HandCoins } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { Table, type TableColumn } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { TransactionStatusBadge } from "@/components/features/history/TransactionStatusBadge";
import { formatDate, formatEuros } from "@/lib/format";
import type { Transaction } from "@/types/transaction";

const columns: Array<TableColumn<Transaction>> = [
  {
    header: "Date",
    render: (row) => <span className="text-gray-600">{formatDate(row.createdAt)}</span>,
  },
  {
    header: "Montant",
    render: (row) => <span className="font-semibold text-gray-900">{formatEuros(row.amount)}</span>,
  },
  {
    header: "Statut",
    render: (row) => <TransactionStatusBadge status={row.status} />,
  },
  {
    header: "Référence",
    render: (row) => <span className="font-mono text-xs text-gray-500">{row.id}</span>,
  },
];

export function HistoryPage() {
  const { currentUser } = useAuth();
  const transactions = currentUser?.transactions ?? [];
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <PageContainer className="py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mes dons</h1>
        <p className="mt-2 text-gray-600">Retrouvez l'historique de vos transactions.</p>
      </div>

      {sortedTransactions.length === 0 ? (
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
      ) : (
        <Table columns={columns} rows={sortedTransactions} rowKey={(row) => row.id} />
      )}
    </PageContainer>
  );
}
