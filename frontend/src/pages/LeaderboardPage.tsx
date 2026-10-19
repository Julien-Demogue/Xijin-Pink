import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { DonorTierBadge } from "@/components/features/leaderboard/DonorTierBadge";
import { formatCents } from "@/lib/format";
import { ApiError, donationsLeaderboard } from "@/lib/apiClient";
import type { LeaderboardEntry } from "@/types/leaderboard";
import { cn } from "@/lib/cn";

const columns: Array<TableColumn<LeaderboardEntry>> = [
  {
    header: "Rang",
    render: (row) => <span className="font-semibold text-gray-400">#{row.rank}</span>,
  },
  {
    header: "Donateur",
    render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.displayName} size="sm" />
        <span className="font-medium text-gray-900">{row.displayName}</span>
      </div>
    ),
  },
  {
    header: "Total donné",
    render: (row) => <span className="font-semibold text-gray-900">{formatCents(row.totalCents)}</span>,
  },
  {
    header: "Titre",
    render: (row) => <DonorTierBadge title={row.title} />,
  },
];

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    donationsLeaderboard()
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger le classement."));
  }, []);

  return (
    <PageContainer className="py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Classement des donateurs</h1>
        <p className="mt-2 text-gray-600">
          Merci à toutes les personnes qui soutiennent la fondation Xijin Pink.
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {!error && !entries && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {entries && entries.length === 0 && (
        <p className="text-center text-gray-500">Aucun don confirmé pour le moment.</p>
      )}

      {entries && entries.length > 0 && (
        <Table
          columns={columns}
          rows={entries}
          rowKey={(row) => String(row.rank)}
          rowClassName={(row) => cn(row.rank <= 3 && "bg-brand-primary-soft/40")}
        />
      )}
    </PageContainer>
  );
}
