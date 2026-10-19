import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { DonationSuccess } from "@/components/features/donation/DonationSuccess";
import { useAuth } from "@/context/AuthContext";
import { donationsHistory } from "@/lib/apiClient";
import type { Transaction } from "@/types/transaction";

const PENDING_DONATION_KEY = "xijinpink_pending_donation";

interface PendingDonation {
  reference: string;
  amountCents: number;
  createdAt: string;
}

function readPendingDonation(): PendingDonation | null {
  const raw = sessionStorage.getItem(PENDING_DONATION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingDonation;
  } catch {
    return null;
  }
}

export function DonationReturnPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [pending] = useState<PendingDonation | null>(() => readPendingDonation());
  const [resolved, setResolved] = useState<Transaction | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem(PENDING_DONATION_KEY);
  }, []);

  useEffect(() => {
    // Waits for AuthContext's own session hydration (authLoading) before
    // deciding whether to look the donation up — otherwise this would run
    // once on mount while isAuthenticated is still transiently false and
    // never retry once the session resolves.
    if (authLoading || !pending) return;
    if (!isAuthenticated) {
      setHasFetched(true);
      return;
    }
    let cancelled = false;
    donationsHistory()
      .then((transactions) => {
        if (!cancelled) {
          setResolved(transactions.find((t) => t.reference === pending.reference) ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      })
      .finally(() => {
        if (!cancelled) setHasFetched(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, pending]);

  if (!pending) {
    return (
      <PageContainer className="max-w-xl py-16 text-center">
        <Card variant="elevated">
          <p className="text-gray-600">
            Aucun don en cours de traitement.{" "}
            <Link to="/don" className="font-medium text-brand-accent hover:underline">
              Faire un don
            </Link>
          </p>
        </Card>
      </PageContainer>
    );
  }

  const isLoading = authLoading || !hasFetched;

  return (
    <PageContainer className="max-w-xl py-16">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : resolved ? (
        <DonationSuccess
          reference={resolved.reference}
          amountCents={resolved.amountCents}
          createdAt={resolved.createdAt}
          status={resolved.status}
          showHistoryLink={isAuthenticated}
        />
      ) : (
        <DonationSuccess
          reference={pending.reference}
          amountCents={pending.amountCents}
          createdAt={pending.createdAt}
          status="pending"
          showHistoryLink={isAuthenticated}
          note={
            !isAuthenticated
              ? "Connectez-vous pour retrouver ce don dans votre historique."
              : undefined
          }
        />
      )}
    </PageContainer>
  );
}
