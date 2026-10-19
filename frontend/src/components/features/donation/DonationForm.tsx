import type { FormEvent } from "react";
import { HandHeart } from "lucide-react";
import { AmountPicker } from "@/components/features/donation/AmountPicker";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export interface DonationFormValues {
  selectedPreset: number | null;
  customAmount: string;
  email: string;
}

export interface DonationFormErrors {
  amount?: string;
  email?: string;
}

interface DonationFormProps {
  values: DonationFormValues;
  errors: DonationFormErrors;
  isSubmitting: boolean;
  showEmail: boolean;
  failureNotice?: string;
  onChange: (values: DonationFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function DonationForm({
  values,
  errors,
  isSubmitting,
  showEmail,
  failureNotice,
  onChange,
  onSubmit,
}: DonationFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {failureNotice && <Alert tone="error">{failureNotice}</Alert>}

      <AmountPicker
        selectedPreset={values.selectedPreset}
        customAmount={values.customAmount}
        onSelectPreset={(amount) =>
          onChange({ ...values, selectedPreset: amount, customAmount: "" })
        }
        onCustomAmountChange={(customAmount) =>
          onChange({ ...values, customAmount, selectedPreset: null })
        }
        error={errors.amount}
      />

      {showEmail && (
        <Input
          label="Adresse email"
          name="email"
          type="email"
          placeholder="vous@example.fr"
          hint="Nécessaire pour un don sans compte."
          value={values.email}
          onChange={(event) => onChange({ ...values, email: event.target.value })}
          error={errors.email}
          disabled={isSubmitting}
        />
      )}

      <Button
        type="submit"
        size="lg"
        isLoading={isSubmitting}
        leftIcon={<HandHeart className="h-5 w-5" />}
        fullWidth
      >
        {isSubmitting ? "Redirection vers le paiement…" : "Faire mon don"}
      </Button>
    </form>
  );
}
