import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  DonationForm,
  type DonationFormErrors,
  type DonationFormValues,
} from "@/components/features/donation/DonationForm";
import {
  CardPaymentForm,
  TEST_CARD,
  type CardFormErrors,
  type CardFormValues,
} from "@/components/features/donation/CardPaymentForm";
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

const INITIAL_CARD_VALUES: CardFormValues = {
  holderName: "",
  cardNumber: "",
  expiry: "",
  cvv: "",
};

function validateCard(values: CardFormValues): CardFormErrors {
  const errors: CardFormErrors = {};
  if (!values.holderName.trim()) {
    errors.holderName = "Veuillez indiquer le nom du titulaire.";
  }
  if (values.cardNumber.replace(/\s/g, "").length !== 16) {
    errors.cardNumber = "Numéro de carte invalide (16 chiffres).";
  }
  if (!/^\d{2}\/\d{2}$/.test(values.expiry)) {
    errors.expiry = "Date d'expiration invalide (MM/AA).";
  }
  if (!/^\d{3}$/.test(values.cvv)) {
    errors.cvv = "CVV invalide (3 chiffres).";
  }
  return errors;
}

function isAcceptedTestCard(values: CardFormValues): boolean {
  return (
    values.holderName.trim().toLowerCase() === TEST_CARD.holderName &&
    values.cardNumber.replace(/\s/g, "") === TEST_CARD.cardNumber &&
    values.expiry === TEST_CARD.expiry &&
    values.cvv === TEST_CARD.cvv
  );
}

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
  const [step, setStep] = useState<"amount" | "card">("amount");
  const [values, setValues] = useState<DonationFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<DonationFormErrors>({});
  const [cardValues, setCardValues] = useState<CardFormValues>(INITIAL_CARD_VALUES);
  const [cardErrors, setCardErrors] = useState<CardFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failureNotice, setFailureNotice] = useState<string>();
  const [declineNotice, setDeclineNotice] = useState<string>();

  function handleAmountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate(values, !isAuthenticated);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setStep("card");
  }

  async function handleCardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateCard(cardValues);
    setCardErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setDeclineNotice(undefined);

    if (!isAcceptedTestCard(cardValues)) {
      setDeclineNotice(
        "Carte refusée par l'émetteur. Utilisez la carte de test fournie pour cette démonstration.",
      );
      return;
    }

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
      setStep("amount");
    }
  }

  function handleBackToAmount() {
    setDeclineNotice(undefined);
    setStep("amount");
  }

  return (
    <PageContainer className="max-w-xl py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Faire un don</h1>
        <p className="mt-2 text-gray-600">
          Choisissez un montant et soutenez la lutte contre le cancer du sein.
        </p>
      </div>

      {!isAuthenticated && step === "amount" && (
        <Alert tone="success">
          Vous pouvez donner sans compte avec votre email, ou vous connecter pour
          retrouver ce don dans votre historique.
        </Alert>
      )}

      <Card variant="elevated" className="mt-4">
        {step === "amount" ? (
          <DonationForm
            values={values}
            errors={errors}
            isSubmitting={false}
            showEmail={!isAuthenticated}
            failureNotice={failureNotice}
            onChange={setValues}
            onSubmit={handleAmountSubmit}
          />
        ) : (
          <CardPaymentForm
            values={cardValues}
            errors={cardErrors}
            isSubmitting={isSubmitting}
            declineNotice={declineNotice}
            onChange={setCardValues}
            onSubmit={handleCardSubmit}
            onBack={handleBackToAmount}
          />
        )}
      </Card>
    </PageContainer>
  );
}
