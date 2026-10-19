import { MOCK_LEADERBOARD } from "@/data/mockLeaderboard";
import { PageContainer } from "@/components/layout/PageContainer";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { DonorTierBadge } from "@/components/features/leaderboard/DonorTierBadge";
import { formatEuros } from "@/lib/format";
import type { LeaderboardEntry } from "@/types/leaderboard";
import { cn } from "@/lib/cn";

const sortedEntries = [...MOCK_LEADERBOARD].sort((a, b) => b.totalDonated - a.totalDonated);

const columns: Array<TableColumn<LeaderboardEntry>> = [
  {
    header: "Rang",
    render: (_row, index) => <span className="font-semibold text-gray-400">#{index + 1}</span>,
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
    render: (row) => <span className="font-semibold text-gray-900">{formatEuros(row.totalDonated)}</span>,
  },
  {
    header: "Titre",
    render: (row) => <DonorTierBadge totalDonated={row.totalDonated} />,
  },
];

export function LeaderboardPage() {
  return (
    <PageContainer className="py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Classement des donateurs</h1>
        <p className="mt-2 text-gray-600">
          Merci à toutes les personnes qui soutiennent la fondation Xijin Pink.
        </p>
      </div>

      <Table
        columns={columns}
        rows={sortedEntries}
        rowKey={(row) => row.id}
        rowClassName={(_row, index) => cn(index < 3 && "bg-brand-primary-soft/40")}
      />
    </PageContainer>
  );
}
