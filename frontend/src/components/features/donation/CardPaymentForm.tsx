import type { FormEvent } from "react";
import { CreditCard } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export interface CardFormValues {
  holderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

export interface CardFormErrors {
  holderName?: string;
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
}

export const TEST_CARD: CardFormValues = {
  holderName: "accepter tout",
  cardNumber: "4242424242424242",
  expiry: "01/27",
  cvv: "123",
};

export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

interface CardPaymentFormProps {
  values: CardFormValues;
  errors: CardFormErrors;
  isSubmitting: boolean;
  declineNotice?: string;
  onChange: (values: CardFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}

export function CardPaymentForm({
  values,
  errors,
  isSubmitting,
  declineNotice,
  onChange,
  onSubmit,
  onBack,
}: CardPaymentFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Alert tone="success">
        Démonstration : utilisez la carte de test {TEST_CARD.cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ")},
        titulaire « {TEST_CARD.holderName} », expiration {TEST_CARD.expiry}, CVV {TEST_CARD.cvv}.
      </Alert>

      {declineNotice && <Alert tone="error">{declineNotice}</Alert>}

      <Input
        label="Nom du titulaire"
        name="holderName"
        autoComplete="cc-name"
        placeholder="NOM DU TITULAIRE"
        value={values.holderName}
        onChange={(event) => onChange({ ...values, holderName: event.target.value })}
        error={errors.holderName}
        disabled={isSubmitting}
      />

      <Input
        label="Numéro de carte"
        name="cardNumber"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="4242 4242 4242 4242"
        value={values.cardNumber}
        onChange={(event) => onChange({ ...values, cardNumber: formatCardNumber(event.target.value) })}
        error={errors.cardNumber}
        disabled={isSubmitting}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date d'expiration"
          name="expiry"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="01/27"
          value={values.expiry}
          onChange={(event) => onChange({ ...values, expiry: formatExpiry(event.target.value) })}
          error={errors.expiry}
          disabled={isSubmitting}
        />
        <Input
          label="CVV"
          name="cvv"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="123"
          value={values.cvv}
          onChange={(event) =>
            onChange({ ...values, cvv: event.target.value.replace(/\D/g, "").slice(0, 3) })
          }
          error={errors.cvv}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting} fullWidth>
          Retour
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          leftIcon={<CreditCard className="h-5 w-5" />}
          fullWidth
        >
          {isSubmitting ? "Validation…" : "Payer"}
        </Button>
      </div>
    </form>
  );
}
