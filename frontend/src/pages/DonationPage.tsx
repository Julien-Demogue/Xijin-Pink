import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  DonationForm,
  type DonationFormErrors,
  type DonationFormValues,
} from "@/components/features/donation/DonationForm";
import { DonationSuccess } from "@/components/features/donation/DonationSuccess";
import { useAuth } from "@/context/AuthContext";
import { createFakeTransaction } from "@/lib/mockTransaction";
import type { Transaction } from "@/types/transaction";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_VALUES: DonationFormValues = {
  selectedPreset: null,
  customAmount: "",
  name: "",
  email: "",
  message: "",
};

function parseAmount(values: DonationFormValues): number | null {
  if (values.selectedPreset !== null) return values.selectedPreset;
  if (!values.customAmount.trim()) return null;
  const parsed = Number(values.customAmount.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function validate(values: DonationFormValues): DonationFormErrors {
  const errors: DonationFormErrors = {};
  const amount = parseAmount(values);

  if (amount === null || Number.isNaN(amount)) {
    errors.amount = "Veuillez choisir ou saisir un montant.";
  } else if (amount < 1 || amount > 5000) {
    errors.amount = "Veuillez saisir un montant entre 1 € et 5000 €.";
  }

  if (values.name.trim().length < 2) {
    errors.name = "Veuillez indiquer votre nom.";
  }

  if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Adresse email invalide.";
  }

  return errors;
}

export function DonationPage() {
  const { isAuthenticated, addDonation } = useAuth();
  const [values, setValues] = useState<DonationFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<DonationFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [failureNotice, setFailureNotice] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setFailureNotice(undefined);
    const amount = parseAmount(values) as number;

    const result = await createFakeTransaction({
      donorEmail: values.email.trim(),
      amount,
      message: values.message.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.status === "failed") {
      setFailureNotice("Le paiement simulé a échoué. Réessayez.");
      if (isAuthenticated) addDonation(result);
      return;
    }

    if (isAuthenticated) addDonation(result);
    setTransaction(result);
  }

  function handleReset() {
    setValues(INITIAL_VALUES);
    setErrors({});
    setTransaction(null);
    setFailureNotice(undefined);
  }

  return (
    <PageContainer className="max-w-xl py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Faire un don</h1>
        <p className="mt-2 text-gray-600">
          Choisissez un montant et soutenez la lutte contre le cancer du sein.
        </p>
      </div>

      {transaction ? (
        <DonationSuccess
          transaction={transaction}
          isAuthenticated={isAuthenticated}
          onReset={handleReset}
        />
      ) : (
        <Card variant="elevated">
          <DonationForm
            values={values}
            errors={errors}
            isSubmitting={isSubmitting}
            failureNotice={failureNotice}
            onChange={setValues}
            onSubmit={handleSubmit}
          />
        </Card>
      )}
    </PageContainer>
  );
}
