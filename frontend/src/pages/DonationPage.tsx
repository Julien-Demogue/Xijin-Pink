import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  DonationForm,
  type DonationFormErrors,
  type DonationFormValues,
} from "@/components/features/donation/DonationForm";
import { useAuth } from "@/context/AuthContext";
import { ApiError, donationsCheckout } from "@/lib/apiClient";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PENDING_DONATION_KEY = "xijinpink_pending_donation";
const MIN_AMOUNT_EUROS = 1;
const MAX_AMOUNT_EUROS = 10000;

const INITIAL_VALUES: DonationFormValues = {
  selectedPreset: null,
  customAmount: "",
  email: "",
};

function parseAmount(values: DonationFormValues): number | null {
  if (values.selectedPreset !== null) return values.selectedPreset;
  if (!values.customAmount.trim()) return null;
  const parsed = Number(values.customAmount.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function validate(values: DonationFormValues, requireEmail: boolean): DonationFormErrors {
  const errors: DonationFormErrors = {};
  const amount = parseAmount(values);

  if (amount === null || Number.isNaN(amount)) {
    errors.amount = "Veuillez choisir ou saisir un montant.";
  } else if (amount < MIN_AMOUNT_EUROS || amount > MAX_AMOUNT_EUROS) {
    errors.amount = `Veuillez saisir un montant entre ${MIN_AMOUNT_EUROS} € et ${MAX_AMOUNT_EUROS} €.`;
  }

  if (requireEmail && !EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Adresse email invalide.";
  }

  return errors;
}

export function DonationPage() {
  const { isAuthenticated } = useAuth();
  const [values, setValues] = useState<DonationFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<DonationFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failureNotice, setFailureNotice] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate(values, !isAuthenticated);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setFailureNotice(undefined);
    const amountCents = Math.round((parseAmount(values) as number) * 100);

    try {
      const { reference, paymentUrl } = await donationsCheckout({
        amount: amountCents,
        currency: "EUR",
        email: isAuthenticated ? undefined : values.email.trim(),
      });
      sessionStorage.setItem(
        PENDING_DONATION_KEY,
        JSON.stringify({ reference, amountCents, createdAt: new Date().toISOString() }),
      );
      window.location.href = paymentUrl;
    } catch (error) {
      setIsSubmitting(false);
      setFailureNotice(
        error instanceof ApiError ? error.message : "Une erreur est survenue. Réessayez.",
      );
    }
  }

  return (
    <PageContainer className="max-w-xl py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Faire un don</h1>
        <p className="mt-2 text-gray-600">
          Choisissez un montant et soutenez la lutte contre le cancer du sein.
        </p>
      </div>

      {!isAuthenticated && (
        <Alert tone="success">
          Vous pouvez donner sans compte avec votre email, ou vous connecter pour
          retrouver ce don dans votre historique.
        </Alert>
      )}

      <Card variant="elevated" className="mt-4">
        <DonationForm
          values={values}
          errors={errors}
          isSubmitting={isSubmitting}
          showEmail={!isAuthenticated}
          failureNotice={failureNotice}
          onChange={setValues}
          onSubmit={handleSubmit}
        />
      </Card>
    </PageContainer>
  );
}
